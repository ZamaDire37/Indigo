const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

// Public/User endpoint to submit appeal
router.post('/appeals', authRequired, (req, res) => {
  try {
    const { action_type, reason } = req.body;
    if (!action_type || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'Action type and explanation are required' });
    }

    const appealId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO appeals (id, user_id, action_type, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(appealId, req.user.id, action_type, reason.trim(), now);

    res.status(201).json({ message: 'Appeal submitted successfully. Indigo administrators will review your case.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// All routes below require Admin privileges
router.use(adminRequired);

// Platform Overview Statistics
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalWorks = db.prepare('SELECT COUNT(*) as count FROM works').get().count;
    const publishedWorks = db.prepare('SELECT COUNT(*) as count FROM works WHERE is_published = 1').get().count;
    const totalReads = db.prepare('SELECT COALESCE(SUM(reads_count), 0) as count FROM works').get().count;
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
    const pendingReports = db.prepare('SELECT COUNT(*) as count FROM reports WHERE status = "pending"').get().count;
    const pendingAppeals = db.prepare('SELECT COUNT(*) as count FROM appeals WHERE status = "pending"').get().count;

    // Most popular books
    const popularBooks = db.prepare(`
      SELECT w.id, w.title, w.category, w.reads_count, p.name as pen_name,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) as avg_rating
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      ORDER BY w.reads_count DESC
      LIMIT 5
    `).all();

    // Most active writers
    const activeWriters = db.prepare(`
      SELECT p.id, p.name, u.username,
        COUNT(w.id) as works_count,
        COALESCE(SUM(w.reads_count), 0) as total_reads
      FROM pen_names p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN works w ON w.pen_name_id = p.id
      GROUP BY p.id
      ORDER BY works_count DESC, total_reads DESC
      LIMIT 5
    `).all();

    // Recent activity log
    const recentWorks = db.prepare(`
      SELECT w.id, w.title, w.category, w.created_at, p.name as pen_name
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      ORDER BY w.created_at DESC
      LIMIT 6
    `).all();

    res.json({
      metrics: {
        totalUsers,
        totalWorks,
        publishedWorks,
        totalReads,
        totalComments,
        pendingReports,
        pendingAppeals
      },
      popularBooks,
      activeWriters,
      recentWorks
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});

// Users Management
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.email, u.role, u.is_suspended, u.created_at,
        (SELECT COUNT(*) FROM pen_names p WHERE p.user_id = u.id) as pen_names_count,
        (SELECT COUNT(*) FROM works w JOIN pen_names p ON p.id = w.pen_name_id WHERE p.user_id = u.id) as works_count,
        (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'user' AND r.target_id = u.id) as reports_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Suspend / Unsuspend User
router.put('/users/:id/suspend', (req, res) => {
  try {
    const user = db.prepare('SELECT id, is_suspended, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot suspend an administrator account' });
    }

    const newStatus = user.is_suspended ? 0 : 1;
    db.prepare('UPDATE users SET is_suspended = ? WHERE id = ?').run(newStatus, req.params.id);

    // Notify user
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, 'moderation', ?, ?, 0, ?)
    `).run(
      uuidv4(),
      req.params.id,
      newStatus ? 'Account Suspended' : 'Account Reinstated',
      newStatus
        ? 'Your Indigo account has been suspended for violating community rules. You may file an appeal in your settings.'
        : 'Your Indigo account suspension has been lifted by an administrator.',
      now
    );

    res.json({ message: `User account ${newStatus ? 'suspended' : 'reinstated'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update suspension status' });
  }
});

// Content Moderation (Works List)
router.get('/works', (req, res) => {
  try {
    const works = db.prepare(`
      SELECT w.*, p.name as pen_name, u.username as owner_username, u.id as owner_id,
        (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'work' AND r.target_id = w.id) as reports_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.work_id = w.id) as comments_count
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      JOIN users u ON u.id = p.user_id
      ORDER BY reports_count DESC, w.created_at DESC
    `).all();

    res.json(works);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch works' });
  }
});

// Moderate Work (Unpublish / Remove or Restore)
router.put('/works/:id/moderation', (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'remove', 'restore'
    const work = db.prepare(`
      SELECT w.*, p.user_id as author_user_id, p.name as pen_name
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const now = new Date().toISOString();
    if (action === 'remove') {
      db.prepare('UPDATE works SET is_published = 0, updated_at = ? WHERE id = ?').run(now, req.params.id);

      // Send moderation notification to author
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (?, ?, 'moderation', ?, ?, ?, 0, ?)
      `).run(
        uuidv4(),
        work.author_user_id,
        'Work Removed by Moderation',
        `Your publication "${work.title}" was unpublished by platform moderators. Reason: ${reason || 'Community guidelines violation'}. You can submit an appeal.`,
        '/settings',
        now
      );

      res.json({ message: 'Work successfully removed from public discovery' });
    } else if (action === 'restore') {
      db.prepare('UPDATE works SET is_published = 1, updated_at = ? WHERE id = ?').run(now, req.params.id);

      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (?, ?, 'moderation', ?, ?, ?, 0, ?)
      `).run(
        uuidv4(),
        work.author_user_id,
        'Work Restored',
        `Your publication "${work.title}" has been restored to public view.`,
        `/book/${work.id}`,
        now
      );

      res.json({ message: 'Work successfully restored' });
    } else {
      res.status(400).json({ error: 'Invalid moderation action' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to moderate work' });
  }
});

// Reports Management
router.get('/reports', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT r.*, u.username as reporter_username
      FROM reports r
      JOIN users u ON u.id = r.reporter_id
    `;
    const params = [];
    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }
    query += ' ORDER BY r.created_at DESC';

    const reports = db.prepare(query).all(...params);

    // Hydrate targets
    const hydrated = reports.map(r => {
      let targetInfo = null;
      if (r.target_type === 'work') {
        targetInfo = db.prepare('SELECT id, title, category FROM works WHERE id = ?').get(r.target_id);
      } else if (r.target_type === 'comment') {
        targetInfo = db.prepare('SELECT id, content, work_id FROM comments WHERE id = ?').get(r.target_id);
      } else if (r.target_type === 'user') {
        targetInfo = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(r.target_id);
      }
      return {
        ...r,
        targetInfo
      };
    });

    res.json(hydrated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Resolve or Dismiss Report
router.put('/reports/:id', (req, res) => {
  try {
    const { status } = req.body; // 'resolved', 'dismissed'
    if (!['resolved', 'dismissed', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: `Report marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Appeals Management
router.get('/appeals', (req, res) => {
  try {
    const appeals = db.prepare(`
      SELECT a.*, u.username, u.email
      FROM appeals a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
    `).all();

    res.json(appeals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

// Review Appeal
router.put('/appeals/:id', (req, res) => {
  try {
    const { status, admin_notes } = req.body; // 'approved', 'rejected'
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid appeal decision status' });
    }

    const appeal = db.prepare('SELECT * FROM appeals WHERE id = ?').get(req.params.id);
    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found' });
    }

    db.prepare('UPDATE appeals SET status = ?, admin_notes = ? WHERE id = ?').run(
      status,
      admin_notes || '',
      req.params.id
    );

    // If appeal was regarding account suspension and was approved, unsuspend user
    if (status === 'approved' && appeal.action_type === 'suspension') {
      db.prepare('UPDATE users SET is_suspended = 0 WHERE id = ?').run(appeal.user_id);
    }

    // Send notification
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, 'moderation', ?, ?, 0, ?)
    `).run(
      uuidv4(),
      appeal.user_id,
      `Appeal ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your appeal has been ${status}. ${admin_notes ? `Administrator notes: ${admin_notes}` : ''}`,
      now
    );

    res.json({ message: `Appeal marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review appeal' });
  }
});

module.exports = router;
