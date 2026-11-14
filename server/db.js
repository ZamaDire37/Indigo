const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'indigo.db');

let SQL;
let rawDb;

function saveDb() {
  if (rawDb) {
    const data = rawDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

function normalizeParams(args) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
    const obj = args[0];
    const normalized = {};
    for (const k of Object.keys(obj)) {
      const key = k.startsWith('@') || k.startsWith(':') || k.startsWith('$') ? k : `@${k}`;
      normalized[key] = obj[k];
    }
    return normalized;
  }
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

const db = {
  pragma(str) {
    if (rawDb) {
      try {
        rawDb.exec(`PRAGMA ${str};`);
      } catch (e) {
        // pragma safe ignore if not supported in in-memory
      }
    }
  },

  exec(sql) {
    if (!rawDb) throw new Error('Database not initialized yet');
    rawDb.exec(sql);
    saveDb();
  },

  prepare(sql) {
    return {
      get(...args) {
        if (!rawDb) throw new Error('Database not initialized yet');
        const stmt = rawDb.prepare(sql);
        try {
          const params = normalizeParams(args);
          if (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...args) {
        if (!rawDb) throw new Error('Database not initialized yet');
        const stmt = rawDb.prepare(sql);
        try {
          const params = normalizeParams(args);
          if (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0) {
            stmt.bind(params);
          }
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      run(...args) {
        if (!rawDb) throw new Error('Database not initialized yet');
        const stmt = rawDb.prepare(sql);
        try {
          const params = normalizeParams(args);
          if (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0) {
            stmt.bind(params);
          }
          stmt.step();
          saveDb();
          return { changes: rawDb.getRowsModified() };
        } finally {
          stmt.free();
        }
      }
    };
  },

  transaction(fn) {
    return (...args) => {
      if (!rawDb) throw new Error('Database not initialized yet');
      rawDb.exec('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT;');
        saveDb();
        return result;
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    };
  }
};

async function initDb() {
  if (rawDb) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  // Create tables & schema
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_suspended INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pen_names (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      pen_name_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      category TEXT NOT NULL,
      synopsis TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      genres TEXT DEFAULT '[]',
      status TEXT DEFAULT 'ongoing',
      is_published INTEGER DEFAULT 1,
      reads_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pen_name_id) REFERENCES pen_names(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_id TEXT NOT NULL,
      chapter_id TEXT,
      progress_percentage REAL DEFAULT 0,
      last_paragraph_index INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
      UNIQUE(user_id, work_id)
    );

    CREATE TABLE IF NOT EXISTS library (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'currently_reading',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      UNIQUE(user_id, work_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_id TEXT NOT NULL,
      rating_val INTEGER NOT NULL CHECK(rating_val >= 1 AND rating_val <= 5),
      review_text TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      UNIQUE(user_id, work_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_id TEXT NOT NULL,
      chapter_id TEXT,
      parent_id TEXT,
      content TEXT NOT NULL,
      is_spoiler INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_events (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      user_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pen_name_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      mood TEXT DEFAULT '',
      weather TEXT DEFAULT '',
      entry_date TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pen_name_id) REFERENCES pen_names(id) ON DELETE SET NULL
    );
  `);

  saveDb();

  // Ensure upload folders exist
  const uploadDirs = [
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'uploads', 'covers'),
    path.join(__dirname, '..', 'uploads', 'avatars'),
    path.join(__dirname, '..', 'uploads', 'documents'),
  ];
  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return db;
}

module.exports = db;
module.exports.db = db;
module.exports.initDb = initDb;
