const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

// Get ratings & reviews for a work
router.get('/works/:id/ratings', authOptional, (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.username, u.id AS reviewer_id
      FROM ratings r
      JOIN users u ON u.id = r.user_id
      WHERE r.work_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.id);

    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total_ratings,
        ROUND(AVG(rating_val), 1) AS avg_rating,
        SUM(CASE WHEN rating_val = 5 THEN 1 ELSE 0 END) AS five_stars,
        SUM(CASE WHEN rating_val = 4 THEN 1 ELSE 0 END) AS four_stars,
        SUM(CASE WHEN rating_val = 3 THEN 1 ELSE 0 END) AS three_stars,
        SUM(CASE WHEN rating_val = 2 THEN 1 ELSE 0 END) AS two_stars,
        SUM(CASE WHEN rating_val = 1 THEN 1 ELSE 0 END) AS one_stars
      FROM ratings
      WHERE work_id = ?
    `).get(req.params.id);

    res.json({ reviews, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Rate a work (1-5 stars, single submission per user to prevent inflation)
router.post('/works/:id/rating', authRequired, (req, res) => {
  try {
    const { rating, review_text = '' } = req.body;
    const ratingVal = parseInt(rating, 10);

    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const work = db.prepare(`
      SELECT w.*, p.user_id AS author_user_id, p.name AS pen_name
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM ratings WHERE user_id = ? AND work_id = ?').get(req.user.id, work.id);

    if (existing) {
      db.prepare(`
        UPDATE ratings
        SET rating_val = ?, review_text = ?, created_at = ?
        WHERE id = ?
      `).run(ratingVal, review_text.trim(), now, existing.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO ratings (id, user_id, work_id, rating_val, review_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, work.id, ratingVal, review_text.trim(), now);

      // Notify the author of new rating
      if (work.author_user_id !== req.user.id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
          VALUES (?, ?, 'new_rating', ?, ?, ?, 0, ?)
        `).run(
          uuidv4(),
          work.author_user_id,
          `New Review on ${work.title}`,
          `${req.user.username} rated your work ${ratingVal} stars`,
          `/book/${work.id}`,
          now
        );
      }
    }

    const updatedAvg = db.prepare('SELECT ROUND(AVG(rating_val), 1) as avg, COUNT(*) as count FROM ratings WHERE work_id = ?').get(work.id);

    res.json({
      message: 'Rating recorded successfully',
      avgRating: updatedAvg.avg,
      ratingsCount: updatedAvg.count
    });
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ error: 'Failed to record rating' });
  }
});

// Get comments for work / chapter
router.get('/works/:id/comments', authOptional, (req, res) => {
  try {
    const { chapter_id } = req.query;

    let query = `
      SELECT c.*, u.username,
        (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) AS reply_count
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.work_id = ?
    `;

    const params = [req.params.id];
    if (chapter_id) {
      query += ' AND c.chapter_id = ?';
      params.push(chapter_id);
    }

    query += ' ORDER BY c.created_at DESC';

    const comments = db.prepare(query).all(...params);

    // Structure root comments and replies
    const roots = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);

    const structured = roots.map(root => ({
      ...root,
      replies: replies.filter(r => r.parent_id === root.id).reverse()
    }));

    res.json(structured);
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add comment
router.post('/works/:id/comments', authRequired, (req, res) => {
  try {
    const { content, chapter_id, parent_id, is_spoiler = false } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const work = db.prepare(`
      SELECT w.*, p.user_id AS author_user_id, p.name AS pen_name
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const commentId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO comments (id, user_id, work_id, chapter_id, parent_id, content, is_spoiler, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      commentId,
      req.user.id,
      work.id,
      chapter_id || null,
      parent_id || null,
      content.trim(),
      is_spoiler ? 1 : 0,
      now
    );

    // Notifications
    if (parent_id) {
      // Notify parent comment author
      const parentComment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parent_id);
      if (parentComment && parentComment.user_id !== req.user.id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
          VALUES (?, ?, 'comment_reply', ?, ?, ?, 0, ?)
        `).run(
          uuidv4(),
          parentComment.user_id,
          'New Reply to Your Comment',
          `${req.user.username} replied to your comment on ${work.title}`,
          `/book/${work.id}`,
          now
        );
      }
    } else {
      // Notify book author if not commented by author
      if (work.author_user_id !== req.user.id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
          VALUES (?, ?, 'new_comment', ?, ?, ?, 0, ?)
        `).run(
          uuidv4(),
          work.author_user_id,
          `New Comment on ${work.title}`,
          `${req.user.username} left a comment on your work`,
          `/book/${work.id}`,
          now
        );
      }
    }

    const created = db.prepare(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `).get(commentId);

    res.status(201).json({ message: 'Comment posted', comment: created });
  } catch (err) {
    console.error('Post comment error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Edit comment
router.put('/comments/:id', authRequired, (req, res) => {
  try {
    const { content, is_spoiler } = req.body;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this comment' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    db.prepare('UPDATE comments SET content = ?, is_spoiler = ? WHERE id = ?').run(
      content.trim(),
      is_spoiler !== undefined ? (is_spoiler ? 1 : 0) : comment.is_spoiler,
      req.params.id
    );

    const updated = db.prepare('SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(req.params.id);
    res.json({ message: 'Comment updated', comment: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/comments/:id', authRequired, (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Submit a report (books, comments, users)
router.post('/reports', authRequired, (req, res) => {
  try {
    const { target_type, target_id, reason, details } = req.body;

    if (!target_type || !target_id || !reason) {
      return res.status(400).json({ error: 'target_type, target_id, and reason are required' });
    }

    if (!['work', 'comment', 'user'].includes(target_type)) {
      return res.status(400).json({ error: 'Invalid target_type' });
    }

    const reportId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      reportId,
      req.user.id,
      target_type,
      target_id,
      reason.trim(),
      details ? details.trim() : '',
      now
    );

    res.status(201).json({ message: 'Report submitted for administrator review. Thank you for keeping Indigo safe and literary.' });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
