const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

// Get All Diary Entries for Current Authenticated User (Private + Shared)
router.get('/mine', authRequired, (req, res) => {
  try {
    const { search, month, privacy } = req.query;

    let conditions = ['d.user_id = ?'];
    let params = [req.user.id];

    if (privacy === 'private') {
      conditions.push('d.is_public = 0');
    } else if (privacy === 'public' || privacy === 'shared') {
      conditions.push('d.is_public = 1');
    }

    if (month && month.trim()) {
      conditions.push("d.entry_date LIKE ?");
      params.push(`${month.trim()}%`);
    }

    if (search && search.trim()) {
      conditions.push('(d.title LIKE ? OR d.content LIKE ? OR d.mood LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const entries = db.prepare(`
      SELECT
        d.*,
        p.name AS pen_name,
        p.avatar_url AS author_avatar
      FROM diary_entries d
      LEFT JOIN pen_names p ON p.id = d.pen_name_id
      ${whereClause}
      ORDER BY d.entry_date DESC, d.created_at DESC
    `).all(...params);

    // Summary metrics for user's personal diary
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total_entries,
        SUM(CASE WHEN is_public = 0 THEN 1 ELSE 0 END) AS private_entries,
        SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) AS shared_entries
      FROM diary_entries
      WHERE user_id = ?
    `).get(req.user.id);

    res.json({
      entries,
      stats: {
        total: stats.total_entries || 0,
        privateCount: stats.private_entries || 0,
        sharedCount: stats.shared_entries || 0
      }
    });
  } catch (err) {
    console.error('Fetch my diary error:', err);
    res.status(500).json({ error: 'Failed to retrieve diary entries' });
  }
});

// Get Public / Shared Diary Entries for Discovery & Community
router.get('/public', authOptional, (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let conditions = ['d.is_public = 1'];
    let params = [];

    if (search && search.trim()) {
      conditions.push('(d.title LIKE ? OR d.content LIKE ? OR d.mood LIKE ? OR p.name LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const entries = db.prepare(`
      SELECT
        d.*,
        COALESCE(p.name, u.username) AS author_name,
        p.avatar_url AS author_avatar
      FROM diary_entries d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN pen_names p ON p.id = d.pen_name_id
      ${whereClause}
      ORDER BY d.entry_date DESC, d.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit, 10), offset);

    const total = db.prepare(`
      SELECT COUNT(*) AS count
      FROM diary_entries d
      LEFT JOIN pen_names p ON p.id = d.pen_name_id
      ${whereClause}
    `).get(...params).count;

    res.json({
      entries,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('Fetch public diary error:', err);
    res.status(500).json({ error: 'Failed to retrieve shared entries' });
  }
});

// Get Single Diary Entry (Enforces Privacy Check)
router.get('/entry/:id', authOptional, (req, res) => {
  try {
    const entry = db.prepare(`
      SELECT
        d.*,
        u.username AS owner_username,
        p.name AS pen_name,
        p.avatar_url AS author_avatar
      FROM diary_entries d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN pen_names p ON p.id = d.pen_name_id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    const isOwner = req.user && (req.user.id === entry.user_id || req.user.role === 'admin');

    // Private by default protection: if entry is private, ONLY owner can read
    if (entry.is_public === 0 && !isOwner) {
      return res.status(403).json({ error: 'This diary entry is private to its author.' });
    }

    res.json({
      entry: {
        ...entry,
        isOwner: Boolean(isOwner)
      }
    });
  } catch (err) {
    console.error('Fetch diary entry error:', err);
    res.status(500).json({ error: 'Failed to retrieve diary entry' });
  }
});

// Create New Diary Entry (Private by default)
router.post('/', authRequired, (req, res) => {
  try {
    const {
      title,
      content,
      entry_date,
      mood = '',
      weather = '',
      is_public = 0,
      pen_name_id = null
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Diary entry content cannot be empty.' });
    }

    const now = new Date();
    const todayFormatted = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const resolvedEntryDate = (entry_date && entry_date.trim()) ? entry_date.trim() : todayFormatted;

    // Default title if left blank
    const resolvedTitle = (title && title.trim())
      ? title.trim()
      : `Journal Entry • ${new Date(resolvedEntryDate + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`;

    // Verify pen name ownership if provided
    let verifiedPenNameId = null;
    if (pen_name_id) {
      const pn = db.prepare('SELECT id FROM pen_names WHERE id = ? AND user_id = ?').get(pen_name_id, req.user.id);
      if (pn) verifiedPenNameId = pn.id;
    }

    const entryId = uuidv4();
    const isoNow = now.toISOString();

    db.prepare(`
      INSERT INTO diary_entries (
        id, user_id, pen_name_id, title, content, mood, weather, entry_date, is_public, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entryId,
      req.user.id,
      verifiedPenNameId,
      resolvedTitle,
      content.trim(),
      mood ? mood.trim() : '',
      weather ? weather.trim() : '',
      resolvedEntryDate,
      is_public ? 1 : 0, // Private by default (0)
      isoNow,
      isoNow
    );

    const created = db.prepare(`
      SELECT d.*, p.name AS pen_name, p.avatar_url AS author_avatar
      FROM diary_entries d
      LEFT JOIN pen_names p ON p.id = d.pen_name_id
      WHERE d.id = ?
    `).get(entryId);

    res.status(201).json({
      message: is_public ? 'Diary entry published and shared.' : 'Private diary entry saved securely.',
      entry: created
    });
  } catch (err) {
    console.error('Create diary error:', err);
    res.status(500).json({ error: 'Failed to save diary entry' });
  }
});

// Update Existing Diary Entry
router.put('/:id', authRequired, (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    if (entry.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to modify this diary entry' });
    }

    const {
      title,
      content,
      entry_date,
      mood,
      weather,
      is_public,
      pen_name_id
    } = req.body;

    if (content !== undefined && !content.trim()) {
      return res.status(400).json({ error: 'Entry content cannot be empty.' });
    }

    // Verify pen name if changing
    let targetPenNameId = entry.pen_name_id;
    if (pen_name_id !== undefined) {
      if (pen_name_id === null || pen_name_id === '') {
        targetPenNameId = null;
      } else {
        const pn = db.prepare('SELECT id FROM pen_names WHERE id = ? AND user_id = ?').get(pen_name_id, req.user.id);
        if (pn) targetPenNameId = pn.id;
      }
    }

    const now = new Date().toISOString();
    const updatedTitle = title !== undefined ? title.trim() : entry.title;
    const updatedContent = content !== undefined ? content.trim() : entry.content;
    const updatedDate = entry_date !== undefined ? entry_date.trim() : entry.entry_date;
    const updatedMood = mood !== undefined ? mood.trim() : entry.mood;
    const updatedWeather = weather !== undefined ? weather.trim() : entry.weather;
    const updatedIsPublic = is_public !== undefined ? (is_public ? 1 : 0) : entry.is_public;

    db.prepare(`
      UPDATE diary_entries
      SET title = ?,
          content = ?,
          entry_date = ?,
          mood = ?,
          weather = ?,
          is_public = ?,
          pen_name_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedContent,
      updatedDate,
      updatedMood,
      updatedWeather,
      updatedIsPublic,
      targetPenNameId,
      now,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT d.*, p.name AS pen_name, p.avatar_url AS author_avatar
      FROM diary_entries d
      LEFT JOIN pen_names p ON p.id = d.pen_name_id
      WHERE d.id = ?
    `).get(req.params.id);

    res.json({
      message: 'Diary entry updated successfully',
      entry: updated
    });
  } catch (err) {
    console.error('Update diary error:', err);
    res.status(500).json({ error: 'Failed to update diary entry' });
  }
});

// Quick Toggle Privacy (Private vs Shared)
router.patch('/:id/toggle-privacy', authRequired, (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    if (entry.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to modify this diary entry' });
    }

    const nextIsPublic = entry.is_public === 1 ? 0 : 1;
    const now = new Date().toISOString();

    db.prepare('UPDATE diary_entries SET is_public = ?, updated_at = ? WHERE id = ?')
      .run(nextIsPublic, now, req.params.id);

    res.json({
      message: nextIsPublic === 1 ? 'Entry is now shared publicly' : 'Entry is now private',
      is_public: nextIsPublic
    });
  } catch (err) {
    console.error('Toggle privacy error:', err);
    res.status(500).json({ error: 'Failed to toggle privacy' });
  }
});

// Delete Diary Entry
router.delete('/:id', authRequired, (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    if (entry.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this diary entry' });
    }

    db.prepare('DELETE FROM diary_entries WHERE id = ?').run(req.params.id);

    res.json({ message: 'Diary entry deleted successfully' });
  } catch (err) {
    console.error('Delete diary error:', err);
    res.status(500).json({ error: 'Failed to delete diary entry' });
  }
});

module.exports = router;
