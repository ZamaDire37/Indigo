const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

// Get all reading progress / continue reading items for user
router.get('/progress', authRequired, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT rp.*,
        w.title AS work_title,
        w.slug AS work_slug,
        w.category AS work_category,
        w.cover_url AS work_cover,
        p.name AS pen_name,
        c.title AS chapter_title,
        c.chapter_number
      FROM reading_progress rp
      JOIN works w ON w.id = rp.work_id
      JOIN pen_names p ON p.id = w.pen_name_id
      LEFT JOIN chapters c ON c.id = rp.chapter_id
      WHERE rp.user_id = ?
      ORDER BY rp.updated_at DESC
      LIMIT 10
    `).all(req.user.id);

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reading progress' });
  }
});

// Get specific work reading progress
router.get('/progress/:workId', authRequired, (req, res) => {
  try {
    const progress = db.prepare(`
      SELECT rp.*, c.title as chapter_title, c.chapter_number
      FROM reading_progress rp
      LEFT JOIN chapters c ON c.id = rp.chapter_id
      WHERE rp.user_id = ? AND rp.work_id = ?
    `).get(req.user.id, req.params.workId);

    res.json(progress || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work progress' });
  }
});

// Save / update reading progress
router.post('/progress', authRequired, (req, res) => {
  try {
    const { work_id, chapter_id, progress_percentage = 0, last_paragraph_index = 0 } = req.body;

    if (!work_id) {
      return res.status(400).json({ error: 'work_id is required' });
    }

    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM reading_progress WHERE user_id = ? AND work_id = ?').get(req.user.id, work_id);

    if (existing) {
      db.prepare(`
        UPDATE reading_progress
        SET chapter_id = ?,
            progress_percentage = ?,
            last_paragraph_index = ?,
            updated_at = ?
        WHERE id = ?
      `).run(chapter_id || null, progress_percentage, last_paragraph_index, now, existing.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO reading_progress (id, user_id, work_id, chapter_id, progress_percentage, last_paragraph_index, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, work_id, chapter_id || null, progress_percentage, last_paragraph_index, now);
    }

    // Auto-update or add to library under 'currently_reading' if not already in another status
    const libEntry = db.prepare('SELECT id, status FROM library WHERE user_id = ? AND work_id = ?').get(req.user.id, work_id);
    if (!libEntry) {
      const libId = uuidv4();
      db.prepare(`
        INSERT INTO library (id, user_id, work_id, status, updated_at)
        VALUES (?, ?, ?, 'currently_reading', ?)
      `).run(libId, req.user.id, work_id, now);
    } else if (progress_percentage >= 98 && libEntry.status !== 'completed') {
      // If reader reached the end, mark as completed
      db.prepare('UPDATE library SET status = "completed", updated_at = ? WHERE id = ?').run(now, libEntry.id);
    }

    res.json({ message: 'Reading progress saved' });
  } catch (err) {
    console.error('Save progress error:', err);
    res.status(500).json({ error: 'Failed to save reading progress' });
  }
});

// Get User Library
router.get('/library', authRequired, (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        l.id AS library_id,
        l.status AS library_status,
        l.updated_at AS library_updated_at,
        w.id,
        w.title,
        w.slug,
        w.category,
        w.cover_url,
        w.genres,
        w.status AS work_status,
        w.reads_count,
        p.id AS pen_name_id,
        p.name AS pen_name,
        p.avatar_url AS author_avatar,
        rp.chapter_id AS last_chapter_id,
        c.chapter_number AS last_chapter_number,
        c.title AS last_chapter_title,
        COALESCE(rp.progress_percentage, 0) AS progress_percentage,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) AS avg_rating
      FROM library l
      JOIN works w ON w.id = l.work_id
      JOIN pen_names p ON p.id = w.pen_name_id
      LEFT JOIN reading_progress rp ON rp.user_id = l.user_id AND rp.work_id = w.id
      LEFT JOIN chapters c ON c.id = rp.chapter_id
      WHERE l.user_id = ?
    `;

    const params = [req.user.id];
    if (status && ['currently_reading', 'want_to_read', 'completed', 'saved'].includes(status)) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.updated_at DESC';

    const items = db.prepare(query).all(...params);

    const formatted = items.map(item => ({
      ...item,
      genres: typeof item.genres === 'string' ? JSON.parse(item.genres || '[]') : item.genres
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get library error:', err);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

// Add / Update Library Entry
router.post('/library', authRequired, (req, res) => {
  try {
    const { work_id, status = 'want_to_read' } = req.body;

    if (!work_id) {
      return res.status(400).json({ error: 'work_id is required' });
    }

    if (!['currently_reading', 'want_to_read', 'completed', 'saved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid library shelf status' });
    }

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM library WHERE user_id = ? AND work_id = ?').get(req.user.id, work_id);

    if (existing) {
      db.prepare('UPDATE library SET status = ?, updated_at = ? WHERE id = ?').run(status, now, existing.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO library (id, user_id, work_id, status, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, req.user.id, work_id, status, now);
    }

    res.json({ message: 'Saved to library', status });
  } catch (err) {
    console.error('Add to library error:', err);
    res.status(500).json({ error: 'Failed to update library' });
  }
});

// Remove from Library
router.delete('/library/:workId', authRequired, (req, res) => {
  try {
    db.prepare('DELETE FROM library WHERE user_id = ? AND work_id = ?').run(req.user.id, req.params.workId);
    res.json({ message: 'Removed from library' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from library' });
  }
});

module.exports = router;
