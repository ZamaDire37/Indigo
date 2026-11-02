const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

// Get Single Chapter with navigation
router.get('/:id', authOptional, (req, res) => {
  try {
    const chapter = db.prepare(`
      SELECT c.*,
        w.title AS work_title,
        w.category AS work_category,
        w.status AS work_status,
        w.cover_url AS work_cover,
        p.id AS pen_name_id,
        p.name AS pen_name,
        p.avatar_url AS author_avatar,
        p.user_id AS author_user_id
      FROM chapters c
      JOIN works w ON w.id = c.work_id
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const isOwner = req.user && (req.user.id === chapter.author_user_id || req.user.role === 'admin');

    if (!chapter.is_published && !isOwner) {
      return res.status(403).json({ error: 'This chapter is an unpublished draft.' });
    }

    // All published chapters for this work for table of contents
    const allChapters = db.prepare(`
      SELECT id, chapter_number, title, is_published
      FROM chapters
      WHERE work_id = ? ${isOwner ? '' : 'AND is_published = 1'}
      ORDER BY chapter_number ASC
    `).all(chapter.work_id);

    // Determine previous and next chapters
    const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
    const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
    const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

    // Fetch user progress if authenticated
    let userProgress = null;
    if (req.user) {
      userProgress = db.prepare(`
        SELECT progress_percentage, last_paragraph_index, updated_at
        FROM reading_progress
        WHERE user_id = ? AND work_id = ? AND chapter_id = ?
      `).get(req.user.id, chapter.work_id, chapter.id);
    }

    res.json({
      chapter,
      toc: allChapters,
      prevChapter,
      nextChapter,
      userProgress,
      isOwner
    });
  } catch (err) {
    console.error('Chapter fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});

// Add Chapter to Work
router.post('/', authRequired, (req, res) => {
  try {
    const { work_id, title, content, is_published = 1, chapter_number } = req.body;

    if (!work_id) {
      return res.status(400).json({ error: 'work_id is required' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Chapter content cannot be empty' });
    }

    // Check ownership
    const work = db.prepare(`
      SELECT w.*, p.user_id, p.name as pen_name
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(work_id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to add chapters to this work' });
    }

    // Determine next chapter number if not provided
    let num = chapter_number;
    if (!num) {
      const maxRow = db.prepare('SELECT MAX(chapter_number) as max_num FROM chapters WHERE work_id = ?').get(work_id);
      num = (maxRow && maxRow.max_num ? maxRow.max_num : 0) + 1;
    }

    const chapterId = uuidv4();
    const now = new Date().toISOString();
    const chapterTitle = title && title.trim() ? title.trim() : `Chapter ${num}`;

    db.prepare(`
      INSERT INTO chapters (id, work_id, chapter_number, title, content, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      chapterId,
      work_id,
      num,
      chapterTitle,
      content,
      is_published ? 1 : 0,
      now,
      now
    );

    // Update parent work updated_at
    db.prepare('UPDATE works SET updated_at = ? WHERE id = ?').run(now, work_id);

    // If published, notify users who have saved this book in their library
    if (is_published) {
      const readers = db.prepare(`
        SELECT user_id FROM library WHERE work_id = ? AND user_id != ?
      `).all(work_id, req.user.id);

      const notifyStmt = db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (?, ?, 'chapter_published', ?, ?, ?, 0, ?)
      `);

      for (const reader of readers) {
        notifyStmt.run(
          uuidv4(),
          reader.user_id,
          `New Chapter: ${work.title}`,
          `${work.pen_name} published ${chapterTitle}`,
          `/read/${work.id}/${chapterId}`,
          now
        );
      }
    }

    const created = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
    res.status(201).json({ message: 'Chapter created successfully', chapter: created });
  } catch (err) {
    console.error('Add chapter error:', err);
    res.status(500).json({ error: 'Failed to add chapter' });
  }
});

// Update Chapter
router.put('/:id', authRequired, (req, res) => {
  try {
    const chapter = db.prepare(`
      SELECT c.*, p.user_id
      FROM chapters c
      JOIN works w ON w.id = c.work_id
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    if (chapter.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this chapter' });
    }

    const { title, content, is_published, chapter_number } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE chapters
      SET title = ?,
          content = ?,
          is_published = ?,
          chapter_number = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      title !== undefined ? title.trim() : chapter.title,
      content !== undefined ? content : chapter.content,
      is_published !== undefined ? (is_published ? 1 : 0) : chapter.is_published,
      chapter_number !== undefined ? chapter_number : chapter.chapter_number,
      now,
      req.params.id
    );

    // Update parent work updated_at
    db.prepare('UPDATE works SET updated_at = ? WHERE id = ?').run(now, chapter.work_id);

    const updated = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
    res.json({ message: 'Chapter updated successfully', chapter: updated });
  } catch (err) {
    console.error('Update chapter error:', err);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// Delete Chapter
router.delete('/:id', authRequired, (req, res) => {
  try {
    const chapter = db.prepare(`
      SELECT c.*, p.user_id
      FROM chapters c
      JOIN works w ON w.id = c.work_id
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    if (chapter.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this chapter' });
    }

    db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.id);

    // Renumber remaining chapters cleanly
    const remaining = db.prepare('SELECT id FROM chapters WHERE work_id = ? ORDER BY chapter_number ASC').all(chapter.work_id);
    const updateStmt = db.prepare('UPDATE chapters SET chapter_number = ? WHERE id = ?');
    const updateMany = db.transaction((rows) => {
      rows.forEach((r, idx) => updateStmt.run(idx + 1, r.id));
    });
    updateMany(remaining);

    res.json({ message: 'Chapter deleted and remaining chapters renumbered successfully' });
  } catch (err) {
    console.error('Delete chapter error:', err);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// Reorder Chapters
router.post('/reorder', authRequired, (req, res) => {
  try {
    const { work_id, ordered_chapter_ids } = req.body;

    if (!work_id || !Array.isArray(ordered_chapter_ids)) {
      return res.status(400).json({ error: 'work_id and ordered_chapter_ids array are required' });
    }

    const work = db.prepare(`
      SELECT w.*, p.user_id
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(work_id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to reorder chapters for this work' });
    }

    const updateStmt = db.prepare('UPDATE chapters SET chapter_number = ? WHERE id = ? AND work_id = ?');
    const reorderTransaction = db.transaction((ids) => {
      ids.forEach((id, index) => {
        updateStmt.run(index + 1, id, work_id);
      });
    });

    reorderTransaction(ordered_chapter_ids);

    const updatedChapters = db.prepare('SELECT id, chapter_number, title, is_published FROM chapters WHERE work_id = ? ORDER BY chapter_number ASC').all(work_id);
    res.json({ message: 'Chapters successfully reordered', chapters: updatedChapters });
  } catch (err) {
    console.error('Reorder chapters error:', err);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
});

module.exports = router;
