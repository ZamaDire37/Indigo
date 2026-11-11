const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .substring(0, 60);
}

// Get works with search, filter, and timeframe rankings
router.get('/', authOptional, (req, res) => {
  try {
    const {
      category,
      genre,
      status,
      search,
      sort = 'recent',
      timeframe = 'all_time',
      limit = 24,
      page = 1,
      pen_name_id
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let conditions = ['w.is_published = 1'];
    let params = [];

    if (pen_name_id) {
      conditions.push('w.pen_name_id = ?');
      params.push(pen_name_id);
    }

    if (category && category !== 'all') {
      conditions.push('w.category = ?');
      params.push(category);
    }

    if (status && status !== 'all') {
      conditions.push('w.status = ?');
      params.push(status);
    }

    if (genre && genre !== 'all') {
      conditions.push('w.genres LIKE ?');
      params.push(`%"${genre}"%`);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(w.title LIKE ? OR w.synopsis LIKE ? OR p.name LIKE ? OR w.genres LIKE ?)');
      params.push(q, q, q, q);
    }

    // Timeframe filter for reading activity
    let timeClause = '';
    if (timeframe === 'today') {
      timeClause = "AND re.created_at >= datetime('now', '-1 day')";
    } else if (timeframe === 'this_week') {
      timeClause = "AND re.created_at >= datetime('now', '-7 days')";
    } else if (timeframe === 'this_month') {
      timeClause = "AND re.created_at >= datetime('now', '-30 days')";
    }

    let orderBy = 'w.created_at DESC';
    if (sort === 'most_read') {
      if (timeframe !== 'all_time') {
        orderBy = 'timeframe_reads DESC, w.reads_count DESC';
      } else {
        orderBy = 'w.reads_count DESC';
      }
    } else if (sort === 'highest_rated') {
      orderBy = 'avg_rating DESC, ratings_count DESC';
    } else if (sort === 'most_discussed') {
      orderBy = 'comments_count DESC';
    } else if (sort === 'trending') {
      orderBy = '(timeframe_reads * 2 + comments_count * 3 + COALESCE(avg_rating, 0) * 10) DESC';
    } else if (sort === 'recent') {
      orderBy = 'w.created_at DESC';
    }

    const whereString = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        w.*,
        p.name AS pen_name,
        p.avatar_url AS author_avatar,
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id AND c.is_published = 1) AS chapters_count,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.work_id = w.id) AS ratings_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.work_id = w.id) AS comments_count,
        (SELECT COUNT(*) FROM reading_events re WHERE re.work_id = w.id ${timeClause}) AS timeframe_reads
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      ${whereString}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const works = db.prepare(query).all(...params, parseInt(limit, 10), offset);

    // Total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      ${whereString}
    `;
    const totalCount = db.prepare(countQuery).get(...params).total;

    // Parse JSON genres
    const formattedWorks = works.map(w => ({
      ...w,
      genres: typeof w.genres === 'string' ? JSON.parse(w.genres || '[]') : w.genres
    }));

    res.json({
      works: formattedWorks,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('Fetch works error:', err);
    res.status(500).json({ error: 'Failed to fetch works' });
  }
});

// Get Homepage Discovery Sections
router.get('/homepage', authOptional, (req, res) => {
  try {
    const { timeframe = 'this_week' } = req.query;

    let timeClause = "AND re.created_at >= datetime('now', '-7 days')";
    if (timeframe === 'today') {
      timeClause = "AND re.created_at >= datetime('now', '-1 day')";
    } else if (timeframe === 'this_month') {
      timeClause = "AND re.created_at >= datetime('now', '-30 days')";
    } else if (timeframe === 'all_time') {
      timeClause = "";
    }

    const baseSelect = `
      SELECT
        w.*,
        p.name AS pen_name,
        p.avatar_url AS author_avatar,
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id AND c.is_published = 1) AS chapters_count,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.work_id = w.id) AS ratings_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.work_id = w.id) AS comments_count,
        (SELECT COUNT(*) FROM reading_events re WHERE re.work_id = w.id ${timeClause}) AS timeframe_reads
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.is_published = 1
    `;

    // 1. Trending Now
    const trending = db.prepare(`
      ${baseSelect}
      ORDER BY (timeframe_reads * 3 + comments_count * 2 + COALESCE(avg_rating, 0) * 5) DESC, w.reads_count DESC
      LIMIT 8
    `).all();

    // 2. Most Read (based on selected timeframe activity, with all_time reads preserved)
    const mostRead = db.prepare(`
      ${baseSelect}
      ORDER BY ${timeframe === 'all_time' ? 'w.reads_count DESC' : 'timeframe_reads DESC, w.reads_count DESC'}
      LIMIT 8
    `).all();

    // 3. Highest Rated
    const highestRated = db.prepare(`
      ${baseSelect}
      ORDER BY avg_rating DESC, ratings_count DESC, w.reads_count DESC
      LIMIT 8
    `).all();

    // 4. Most Discussed
    const mostDiscussed = db.prepare(`
      ${baseSelect}
      ORDER BY comments_count DESC, w.reads_count DESC
      LIMIT 8
    `).all();

    // 5. Recently Published
    const recentlyPublished = db.prepare(`
      ${baseSelect}
      ORDER BY w.created_at DESC
      LIMIT 8
    `).all();

    const format = list => list.map(item => ({
      ...item,
      genres: typeof item.genres === 'string' ? JSON.parse(item.genres || '[]') : item.genres
    }));

    res.json({
      trending: format(trending),
      mostRead: format(mostRead),
      highestRated: format(highestRated),
      mostDiscussed: format(mostDiscussed),
      recentlyPublished: format(recentlyPublished)
    });
  } catch (err) {
    console.error('Homepage error:', err);
    res.status(500).json({ error: 'Failed to fetch homepage data' });
  }
});

// Get All Works Owned by Logged-in User (For Creator Studio & Quick CRUD)
router.get('/mine', authRequired, (req, res) => {
  try {
    const userWorks = db.prepare(`
      SELECT
        w.*,
        p.id AS pen_name_id,
        p.name AS pen_name,
        p.avatar_url AS author_avatar,
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id) AS total_chapters_count,
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id AND c.is_published = 1) AS published_chapters_count,
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id AND c.is_published = 0) AS draft_chapters_count,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.work_id = w.id) AS ratings_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.work_id = w.id) AS comments_count
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE p.user_id = ?
      ORDER BY w.updated_at DESC
    `).all(req.user.id);

    const formatted = userWorks.map(w => {
      // Also get lightweight chapters list for quick inline management
      const chaps = db.prepare(`
        SELECT id, chapter_number, title, is_published, created_at, updated_at, LENGTH(content) as char_count
        FROM chapters
        WHERE work_id = ?
        ORDER BY chapter_number ASC
      `).all(w.id);

      return {
        ...w,
        genres: typeof w.genres === 'string' ? JSON.parse(w.genres || '[]') : w.genres,
        chapters: chaps
      };
    });

    res.json({ works: formatted });
  } catch (err) {
    console.error('Fetch my works error:', err);
    res.status(500).json({ error: 'Failed to fetch your works' });
  }
});

// Quick Status & Publication Toggle for Creator
router.patch('/:id/quick-status', authRequired, (req, res) => {
  try {
    const work = db.prepare(`
      SELECT w.*, p.user_id
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this work' });
    }

    const { status, is_published } = req.body;
    const now = new Date().toISOString();

    const newStatus = status !== undefined ? status : work.status;
    const newPublished = is_published !== undefined ? (is_published ? 1 : 0) : work.is_published;

    db.prepare(`
      UPDATE works
      SET status = ?, is_published = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, newPublished, now, req.params.id);

    const updatedWork = {
      ...work,
      status: newStatus,
      is_published: newPublished,
      updated_at: now
    };

    res.json({
      message: 'Status updated successfully',
      work: updatedWork,
      status: newStatus,
      is_published: newPublished
    });
  } catch (err) {
    console.error('Quick status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Duplicate Work as New Draft
router.post('/:id/duplicate', authRequired, (req, res) => {
  try {
    const work = db.prepare(`
      SELECT w.*, p.user_id
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this work' });
    }

    const newWorkId = uuidv4();
    const newTitle = `[Draft Copy] ${work.title}`;
    const newSlug = `${slugify(newTitle)}-${newWorkId.substring(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO works (
        id, pen_name_id, title, slug, category, synopsis, cover_url,
        genres, status, is_published, reads_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ongoing', 0, 0, ?, ?)
    `).run(
      newWorkId,
      work.pen_name_id,
      newTitle,
      newSlug,
      work.category,
      work.synopsis,
      work.cover_url,
      work.genres,
      now,
      now
    );

    // Duplicate all chapters
    const chapters = db.prepare('SELECT * FROM chapters WHERE work_id = ? ORDER BY chapter_number ASC').all(work.id);
    const insertChapStmt = db.prepare(`
      INSERT INTO chapters (id, work_id, chapter_number, title, content, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of chapters) {
      insertChapStmt.run(
        uuidv4(),
        newWorkId,
        c.chapter_number,
        c.title,
        c.content,
        0, // draft copy
        now,
        now
      );
    }

    const dupChapters = db.prepare('SELECT * FROM chapters WHERE work_id = ? ORDER BY chapter_number ASC').all(newWorkId);

    res.status(201).json({
      message: 'Work successfully duplicated as draft',
      newWorkId,
      work: {
        id: newWorkId,
        pen_name_id: work.pen_name_id,
        title: newTitle,
        slug: newSlug,
        category: work.category,
        synopsis: work.synopsis,
        cover_url: work.cover_url,
        genres: work.genres,
        status: 'ongoing',
        is_published: 0
      },
      chapters: dupChapters
    });
  } catch (err) {
    console.error('Duplicate work error:', err);
    res.status(500).json({ error: 'Failed to duplicate work' });
  }
});

// Get Single Work
router.get('/:id', authOptional, (req, res) => {
  try {
    const work = db.prepare(`
      SELECT
        w.*,
        p.name AS pen_name,
        p.bio AS author_bio,
        p.avatar_url AS author_avatar,
        p.user_id AS author_user_id,
        (SELECT ROUND(AVG(rating_val), 1) FROM ratings r WHERE r.work_id = w.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.work_id = w.id) AS ratings_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.work_id = w.id) AS comments_count
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ? OR w.slug = ?
    `).get(req.params.id, req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const isOwner = req.user && (req.user.id === work.author_user_id || req.user.role === 'admin');

    if (!work.is_published && !isOwner) {
      return res.status(404).json({ error: 'This work is currently an unpublished draft.' });
    }

    // Chapters list
    let chapters;
    if (isOwner) {
      chapters = db.prepare(`
        SELECT id, work_id, chapter_number, title, is_published, created_at, updated_at,
          LENGTH(content) AS char_count
        FROM chapters
        WHERE work_id = ?
        ORDER BY chapter_number ASC
      `).all(work.id);
    } else {
      chapters = db.prepare(`
        SELECT id, work_id, chapter_number, title, is_published, created_at, updated_at,
          LENGTH(content) AS char_count
        FROM chapters
        WHERE work_id = ? AND is_published = 1
        ORDER BY chapter_number ASC
      `).all(work.id);
    }

    // User-specific states
    let userRating = null;
    let libraryStatus = null;
    let readingProgress = null;

    if (req.user) {
      const ratingRow = db.prepare('SELECT rating_val, review_text FROM ratings WHERE user_id = ? AND work_id = ?').get(req.user.id, work.id);
      if (ratingRow) userRating = ratingRow;

      const libRow = db.prepare('SELECT status FROM library WHERE user_id = ? AND work_id = ?').get(req.user.id, work.id);
      if (libRow) libraryStatus = libRow.status;

      const progRow = db.prepare('SELECT chapter_id, progress_percentage, last_paragraph_index, updated_at FROM reading_progress WHERE user_id = ? AND work_id = ?').get(req.user.id, work.id);
      if (progRow) readingProgress = progRow;
    }

    res.json({
      work: {
        ...work,
        genres: typeof work.genres === 'string' ? JSON.parse(work.genres || '[]') : work.genres,
        isOwner
      },
      chapters,
      userRating,
      libraryStatus,
      readingProgress
    });
  } catch (err) {
    console.error('Work details error:', err);
    res.status(500).json({ error: 'Failed to fetch work details' });
  }
});

// Create Work
router.post('/', authRequired, (req, res) => {
  try {
    const {
      pen_name_id,
      title,
      category,
      synopsis,
      cover_url,
      genres,
      status = 'ongoing',
      is_published = 1,
      initial_chapter
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!category || !['short_story', 'poem', 'thought'].includes(category)) {
      return res.status(400).json({ error: 'Valid category (short_story, poem, thought) is required' });
    }

    // Validate that pen name belongs to current user or user is admin
    const penName = db.prepare('SELECT * FROM pen_names WHERE id = ?').get(pen_name_id);
    if (!penName || (penName.user_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Invalid pen name selected' });
    }

    const workId = uuidv4();
    const slug = `${slugify(title)}-${workId.substring(0, 8)}`;
    const now = new Date().toISOString();
    const genresJson = JSON.stringify(Array.isArray(genres) ? genres : []);

    db.prepare(`
      INSERT INTO works (
        id, pen_name_id, title, slug, category, synopsis, cover_url,
        genres, status, is_published, reads_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      workId,
      pen_name_id,
      title.trim(),
      slug,
      category,
      synopsis ? synopsis.trim() : '',
      cover_url || '',
      genresJson,
      status,
      is_published ? 1 : 0,
      now,
      now
    );

    // If an initial chapter/content was provided, create Chapter 1
    if (initial_chapter && initial_chapter.content) {
      const chapterId = uuidv4();
      db.prepare(`
        INSERT INTO chapters (id, work_id, chapter_number, title, content, is_published, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      `).run(
        chapterId,
        workId,
        initial_chapter.title ? initial_chapter.title.trim() : (category === 'poem' ? title.trim() : 'Chapter 1'),
        initial_chapter.content,
        initial_chapter.is_published !== undefined ? (initial_chapter.is_published ? 1 : 0) : 1,
        now,
        now
      );
    }

    const created = db.prepare('SELECT * FROM works WHERE id = ?').get(workId);
    res.status(201).json({
      message: 'Work successfully created and published immediately',
      work: {
        ...created,
        genres: JSON.parse(created.genres || '[]')
      }
    });
  } catch (err) {
    console.error('Create work error:', err);
    res.status(500).json({ error: 'Failed to create work' });
  }
});

// Update Work
router.put('/:id', authRequired, (req, res) => {
  try {
    const work = db.prepare(`
      SELECT w.*, p.user_id
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this work' });
    }

    const {
      title,
      category,
      synopsis,
      cover_url,
      genres,
      status,
      is_published,
      pen_name_id
    } = req.body;

    if (category && !['short_story', 'poem', 'thought'].includes(category)) {
      return res.status(400).json({ error: 'Valid category (short_story, poem, thought) is required' });
    }

    // If switching pen name, ensure new pen name also belongs to user
    let newPenNameId = work.pen_name_id;
    if (pen_name_id && pen_name_id !== work.pen_name_id) {
      const pn = db.prepare('SELECT * FROM pen_names WHERE id = ?').get(pen_name_id);
      if (!pn || (pn.user_id !== req.user.id && req.user.role !== 'admin')) {
        return res.status(400).json({ error: 'Invalid pen name for reassignment' });
      }
      newPenNameId = pen_name_id;
    }

    const now = new Date().toISOString();
    const updatedTitle = title !== undefined ? title.trim() : work.title;
    const updatedCategory = category !== undefined ? category : work.category;
    const updatedGenres = genres !== undefined ? JSON.stringify(Array.isArray(genres) ? genres : []) : work.genres;

    db.prepare(`
      UPDATE works
      SET pen_name_id = ?,
          title = ?,
          category = ?,
          synopsis = ?,
          cover_url = ?,
          genres = ?,
          status = ?,
          is_published = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      newPenNameId,
      updatedTitle,
      updatedCategory,
      synopsis !== undefined ? synopsis.trim() : work.synopsis,
      cover_url !== undefined ? cover_url : work.cover_url,
      updatedGenres,
      status !== undefined ? status : work.status,
      is_published !== undefined ? (is_published ? 1 : 0) : work.is_published,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM works WHERE id = ?').get(req.params.id);
    res.json({
      message: 'Work updated successfully',
      work: {
        ...updated,
        genres: JSON.parse(updated.genres || '[]')
      }
    });
  } catch (err) {
    console.error('Update work error:', err);
    res.status(500).json({ error: 'Failed to update work' });
  }
});

// Delete Work
router.delete('/:id', authRequired, (req, res) => {
  try {
    const work = db.prepare(`
      SELECT w.*, p.user_id
      FROM works w
      JOIN pen_names p ON p.id = w.pen_name_id
      WHERE w.id = ?
    `).get(req.params.id);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this work' });
    }

    db.prepare('DELETE FROM works WHERE id = ?').run(req.params.id);
    res.json({ message: 'Work deleted successfully' });
  } catch (err) {
    console.error('Delete work error:', err);
    res.status(500).json({ error: 'Failed to delete work' });
  }
});

// Increment Read Event (for real-time & weekly rankings)
router.post('/:id/read', authOptional, (req, res) => {
  try {
    const work = db.prepare('SELECT id, reads_count FROM works WHERE id = ?').get(req.params.id);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const now = new Date().toISOString();
    const eventId = uuidv4();
    const userId = req.user ? req.user.id : null;

    db.prepare('INSERT INTO reading_events (id, work_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
      eventId,
      work.id,
      userId,
      now
    );

    db.prepare('UPDATE works SET reads_count = reads_count + 1 WHERE id = ?').run(work.id);

    res.json({ success: true, newReadsCount: work.reads_count + 1 });
  } catch (err) {
    console.error('Read event error:', err);
    res.status(500).json({ error: 'Failed to record read' });
  }
});

module.exports = router;
