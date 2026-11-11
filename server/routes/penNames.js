const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

// Get all pen names for logged in user
router.get('/', authRequired, (req, res) => {
  try {
    const penNames = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM works w WHERE w.pen_name_id = p.id AND w.is_published = 1) AS published_works_count,
        (SELECT COALESCE(SUM(reads_count), 0) FROM works w WHERE w.pen_name_id = p.id) AS total_reads
      FROM pen_names p
      WHERE p.user_id = ?
      ORDER BY p.created_at ASC
    `).all(req.user.id);

    res.json(penNames);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pen names' });
  }
});

// Create new pen name
router.post('/', authRequired, (req, res) => {
  try {
    const { name, bio, avatar_url } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Pen name cannot be empty' });
    }

    const penNameId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO pen_names (id, user_id, name, bio, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(penNameId, req.user.id, name.trim(), bio ? bio.trim() : '', avatar_url || '', now);

    const created = db.prepare('SELECT * FROM pen_names WHERE id = ?').get(penNameId);
    res.status(201).json({ message: 'Pen name created successfully', penName: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create pen name' });
  }
});

// Update pen name
router.put('/:id', authRequired, (req, res) => {
  try {
    const { name, bio, avatar_url } = req.body;
    const penName = db.prepare('SELECT * FROM pen_names WHERE id = ?').get(req.params.id);

    if (!penName) {
      return res.status(404).json({ error: 'Pen name not found' });
    }

    if (penName.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to modify this pen name' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Pen name cannot be empty' });
    }

    db.prepare(`
      UPDATE pen_names
      SET name = ?, bio = ?, avatar_url = ?
      WHERE id = ?
    `).run(
      name.trim(),
      bio !== undefined ? bio.trim() : penName.bio,
      avatar_url !== undefined ? avatar_url : penName.avatar_url,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM pen_names WHERE id = ?').get(req.params.id);
    res.json({ message: 'Pen name updated successfully', penName: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pen name' });
  }
});

// Delete pen name with ownership handling
router.delete('/:id', authRequired, (req, res) => {
  try {
    const { action, transferToPenNameId } = req.body; // action: 'transfer' or 'delete_works'
    const penName = db.prepare('SELECT * FROM pen_names WHERE id = ?').get(req.params.id);

    if (!penName) {
      return res.status(404).json({ error: 'Pen name not found' });
    }

    if (penName.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this pen name' });
    }

    const allUserPenNames = db.prepare('SELECT id FROM pen_names WHERE user_id = ?').all(req.user.id);
    if (allUserPenNames.length <= 1) {
      return res.status(400).json({ error: 'You must maintain at least one pen name on your author account. Create a new pen name first.' });
    }

    const worksCount = db.prepare('SELECT COUNT(*) as count FROM works WHERE pen_name_id = ?').get(req.params.id).count;

    if (worksCount > 0) {
      if (!action) {
        return res.status(400).json({
          error: 'Ownership handling required',
          requiresResolution: true,
          worksCount,
          message: `This pen name has ${worksCount} published/draft work(s). Please choose whether to transfer them to another pen name or delete them permanently.`
        });
      }

      if (action === 'transfer') {
        if (!transferToPenNameId) {
          return res.status(400).json({ error: 'Target pen name must be specified for transfer' });
        }
        const targetPenName = db.prepare('SELECT id, user_id FROM pen_names WHERE id = ?').get(transferToPenNameId);
        if (!targetPenName || (targetPenName.user_id !== req.user.id && req.user.role !== 'admin')) {
          return res.status(400).json({ error: 'Invalid target pen name for transfer' });
        }

        db.prepare('UPDATE works SET pen_name_id = ? WHERE pen_name_id = ?').run(transferToPenNameId, req.params.id);
      } else if (action === 'delete_works') {
        // Cascade will delete chapters, reading_progress, ratings, comments, events
        db.prepare('DELETE FROM works WHERE pen_name_id = ?').run(req.params.id);
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be transfer or delete_works' });
      }
    }

    db.prepare('DELETE FROM pen_names WHERE id = ?').run(req.params.id);

    res.json({ message: 'Pen name deleted successfully' });
  } catch (err) {
    console.error('Delete pen name error:', err);
    res.status(500).json({ error: 'Failed to delete pen name' });
  }
});

// Public Author Profile
router.get('/:id/public', authOptional, (req, res) => {
  try {
    const penName = db.prepare(`
      SELECT id, name, bio, avatar_url, created_at
      FROM pen_names
      WHERE id = ?
    `).get(req.params.id);

    if (!penName) {
      return res.status(404).json({ error: 'Author profile not found' });
    }

    const works = db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id AND c.is_published = 1) AS chapters_count,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.work_id = w.id) AS ratings_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.work_id = w.id) AS comments_count
      FROM works w
      WHERE w.pen_name_id = ? AND w.is_published = 1
      ORDER BY w.created_at DESC
    `).all(req.params.id);

    // Compute aggregated author stats
    const totalReads = works.reduce((sum, w) => sum + (w.reads_count || 0), 0);
    const totalComments = works.reduce((sum, w) => sum + (w.comments_count || 0), 0);
    const ratedWorks = works.filter(w => w.avg_rating !== null);
    const overallRating = ratedWorks.length > 0
      ? (ratedWorks.reduce((sum, w) => sum + Number(w.avg_rating), 0) / ratedWorks.length).toFixed(1)
      : null;

    // Group catalogue by categories
    const thoughts = works.filter(w => w.category === 'thought');
    const shortStories = works.filter(w => w.category === 'short_story');
    const poems = works.filter(w => w.category === 'poem');
    const novels = works.filter(w => w.category === 'novel'); // legacy support

    res.json({
      author: penName,
      stats: {
        totalWorks: works.length,
        totalReads,
        totalComments,
        overallRating,
        thoughtsCount: thoughts.length,
        shortStoriesCount: shortStories.length,
        poemsCount: poems.length,
        novelsCount: novels.length
      },
      catalogue: {
        all: works,
        thoughts,
        shortStories,
        poems,
        novels
      }
    });
  } catch (err) {
    console.error('Author public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch author profile' });
  }
});

module.exports = router;
