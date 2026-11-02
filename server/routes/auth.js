const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, authRequired } = require('../middleware/auth');

// Register
router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email is already registered' });
    }

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, 'user', ?)
    `).run(userId, username.trim(), email.trim().toLowerCase(), passwordHash, now);

    // Create an initial default pen name
    const penNameId = uuidv4();
    db.prepare(`
      INSERT INTO pen_names (id, user_id, name, bio, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(penNameId, userId, username.trim(), 'Author on Indigo', now);

    const user = { id: userId, username: username.trim(), email: email.trim().toLowerCase(), role: 'user' };
    const token = generateToken(user);
    const penNames = db.prepare('SELECT * FROM pen_names WHERE user_id = ? ORDER BY created_at ASC').all(userId);

    res.status(201).json({
      message: 'Account successfully registered',
      user,
      token,
      penNames
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { login, password } = req.body; // login can be email or username
    if (!login || !password) {
      return res.status(400).json({ error: 'Login identifier and password are required' });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
    `).get(login.trim(), login.trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please submit an appeal to an administrator.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = generateToken(userInfo);
    const penNames = db.prepare('SELECT * FROM pen_names WHERE user_id = ? ORDER BY created_at ASC').all(user.id);

    res.json({
      message: 'Login successful',
      user: userInfo,
      token,
      penNames
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Current User Me
router.get('/me', authRequired, (req, res) => {
  try {
    const penNames = db.prepare('SELECT * FROM pen_names WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
    res.json({
      user: req.user,
      penNames
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update Profile
router.put('/profile', authRequired, (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?').get(username.trim(), email.trim().toLowerCase(), req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?').run(username.trim(), email.trim().toLowerCase(), req.user.id);

    const updatedUser = {
      ...req.user,
      username: username.trim(),
      email: email.trim().toLowerCase()
    };
    const token = generateToken(updatedUser);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change Password
router.put('/password', authRequired, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Forgot Password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (!user) {
      // Don't disclose user non-existence for security, but return friendly message
      return res.json({ message: 'If that email is registered, password reset instructions have been generated.' });
    }

    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(resetToken, expires, user.id);

    // In a production environment with SMTP, an email would be dispatched.
    // For local full-stack operation and ease of demonstration, we return the resetToken directly in response!
    res.json({
      message: 'Password reset token generated. Use this token to reset your password.',
      resetToken
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// Reset Password with Token
router.post('/reset-password', (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const now = new Date().toISOString();
    const user = db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?').get(resetToken, now);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(newHash, user.id);

    res.json({ message: 'Password has been successfully reset. You may now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
