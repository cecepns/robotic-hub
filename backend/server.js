const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'robotikhub-secret-change-in-production';
const UPLOAD_DIR = path.join(__dirname, 'uploads-robotikhub');

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'robotikhub';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let pool;

async function initDb() {
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\``);
  await conn.end();

  pool = mysql.createPool({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const migrationsPath = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsPath)) {
    const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      const statements = sql
        .split(';')
        .map(s => s.replace(/--.*$/gm, '').trim())
        .filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await pool.execute(stmt);
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_DUP_FIELDNAME') console.error('Migration', file, err.message);
        }
      }
    }
  }
  console.log('MySQL connected:', MYSQL_DATABASE);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + (file.originalname || 'file').replace(/\s/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

async function get(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows && rows[0] ? rows[0] : null;
}

async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows || [];
}

// ---- AUTH ----
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    const r = (role === 'ADMIN' ? 'ADMIN' : 'ANGGOTA');
    const count = await get('SELECT COUNT(*) as c FROM users WHERE role = ?', ['ADMIN']);
    if (r === 'ADMIN' && count.c >= 3) return res.status(400).json({ error: 'Kuota Admin penuh (Maksimal 3 Admin).' });
    const hash = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hash, r]
    );
    const user = await get('SELECT id, name, email, role, avatar_path FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    res.status(201).json({ message: 'Akun berhasil dibuat! Silakan Login.', user: toUser(user) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email ini sudah terdaftar.' });
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib.' });
    const row = await get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!row) return res.status(401).json({ error: 'Email atau password tidak sesuai.' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email atau password tidak sesuai.' });
    const user = toUser(row);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

function toUser(row) {
  if (!row) return null;
  const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar_path ? `${base}/uploads/${path.basename(row.avatar_path)}` : undefined
  };
}

// ---- USERS (for dashboard members list) ----
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT id, name, email, role, avatar_path FROM users ORDER BY id');
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.json(rows.map(r => ({
      id: String(r.id),
      name: r.name,
      email: r.email,
      role: r.role,
      avatar: r.avatar_path ? `${base}/uploads/${path.basename(r.avatar_path)}` : undefined
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/me', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.file) {
      const avatarPath = path.join(UPLOAD_DIR, req.file.filename);
      await run('UPDATE users SET avatar_path = ? WHERE id = ?', [avatarPath, userId]);
    }
    const row = await get('SELECT id, name, email, role, avatar_path FROM users WHERE id = ?', [userId]);
    res.json(toUser(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- GALLERY ----
app.get('/api/gallery', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT id, title, image_path, created_at FROM gallery_photos ORDER BY id DESC');
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.json(rows.map(r => ({
      id: String(r.id),
      title: r.title,
      url: `${base}/uploads/${path.basename(r.image_path)}`
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/gallery', authMiddleware, adminOnly, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File foto wajib.' });
    const title = (req.body.title || req.file.originalname || 'Foto').replace(/\.[^/.]+$/, '');
    const imagePath = path.join(UPLOAD_DIR, req.file.filename);
    const { insertId } = await run('INSERT INTO gallery_photos (title, image_path, created_by) VALUES (?, ?, ?)', [title, imagePath, req.user.id]);
    const row = await get('SELECT id, title, image_path FROM gallery_photos WHERE id = ?', [insertId]);
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({ id: String(row.id), title: row.title, url: `${base}/uploads/${path.basename(row.image_path)}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/gallery/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const row = await get('SELECT image_path FROM gallery_photos WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await run('DELETE FROM gallery_photos WHERE id = ?', [req.params.id]);
    try { fs.unlinkSync(row.image_path); } catch (_) {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- LEARNING MATERIALS ----
app.get('/api/learning', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT id, title, type, file_path, external_url FROM learning_materials ORDER BY id DESC');
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.json(rows.map(r => ({
      id: String(r.id),
      title: r.title,
      type: r.type,
      url: r.external_url || (r.file_path ? `${base}/uploads/${path.basename(r.file_path)}` : '')
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/learning', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const { title, type, url } = req.body;
    const materialType = (type === 'VIDEO' ? 'VIDEO' : 'PDF');
    let filePath = null;
    let externalUrl = null;
    if (req.file) {
      filePath = path.join(UPLOAD_DIR, req.file.filename);
    } else if (url && url.trim()) {
      externalUrl = url.trim();
    } else {
      return res.status(400).json({ error: 'Berikan file atau URL link.' });
    }
    const t = (title || (req.file && req.file.originalname) || 'Materi').replace(/\.[^/.]+$/, '');
    const { insertId } = await run(
      'INSERT INTO learning_materials (title, type, file_path, external_url, created_by) VALUES (?, ?, ?, ?, ?)',
      [t, materialType, filePath, externalUrl, req.user.id]
    );
    const row = await get('SELECT id, title, type, file_path, external_url FROM learning_materials WHERE id = ?', [insertId]);
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({
      id: String(row.id),
      title: row.title,
      type: row.type,
      url: row.external_url || (row.file_path ? `${base}/uploads/${path.basename(row.file_path)}` : '')
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/learning/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const row = await get('SELECT file_path FROM learning_materials WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await run('DELETE FROM learning_materials WHERE id = ?', [req.params.id]);
    if (row.file_path) try { fs.unlinkSync(row.file_path); } catch (_) {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- ACTIVITIES (agenda) ----
app.get('/api/activities', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT id, title, description, date, status FROM activities ORDER BY date DESC');
    res.json(rows.map(r => ({
      id: String(r.id),
      title: r.title,
      description: r.description || '',
      date: r.date,
      status: r.status
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/activities', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, date, time, description } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Judul dan tanggal wajib.' });
    const dateStr = time ? `${date}T${time}` : date;
    const { insertId } = await run(
      'INSERT INTO activities (title, description, date, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [title, description || '', dateStr, 'COMING', req.user.id]
    );
    const row = await get('SELECT id, title, description, date, status FROM activities WHERE id = ?', [insertId]);
    res.status(201).json({ id: String(row.id), title: row.title, description: row.description, date: row.date, status: row.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- ATTENDANCE ----
app.get('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const rows = await all(`
      SELECT ar.id, ar.status, ar.created_at, ar.activity_id,
             a.title as activity_name, u.name as member_name
      FROM attendance_records ar
      LEFT JOIN activities a ON a.id = ar.activity_id
      LEFT JOIN users u ON u.id = ar.user_id
      ORDER BY ar.created_at DESC
    `);
    res.json(rows.map(r => ({
      id: String(r.id),
      memberName: r.member_name || 'Guest',
      activityName: r.activity_name || 'Kegiatan',
      activityId: String(r.activity_id),
      date: r.created_at ? (r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).split('T')[0]) : '',
      status: r.status
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const { memberName, activityId, date } = req.body;
    if (!activityId) return res.status(400).json({ error: 'Pilih kegiatan.' });
    const act = await get('SELECT id, title FROM activities WHERE id = ?', [activityId]);
    if (!act) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' });
    const { insertId } = await run(
      'INSERT INTO attendance_records (user_id, activity_id, status) VALUES (?, ?, ?)',
      [req.user.id, activityId, 'PRESENT']
    );
    const row = await get('SELECT id, created_at FROM attendance_records WHERE id = ?', [insertId]);
    const dateStr = row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString().split('T')[0] : String(row.created_at).split('T')[0]) : (date || new Date().toISOString().split('T')[0]);
    res.status(201).json({
      id: String(row.id),
      memberName: req.body.memberName || req.user.name,
      activityName: act.title,
      date: dateStr,
      status: 'PRESENT'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- CLUB PROFILE ----
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await get('SELECT history, vision FROM club_profile WHERE id = 1');
    const missions = await all('SELECT id, text, position FROM missions WHERE profile_id = 1 ORDER BY position');
    const members = await all('SELECT id, name, role, parent_id, photo_path FROM organization_members WHERE profile_id = 1 ORDER BY id');
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.json({
      history: profile?.history || '',
      vision: profile?.vision || '',
      mission: missions.map(m => m.text),
      structure: members.map(m => ({
        id: String(m.id),
        name: m.name,
        role: m.role,
        parentId: m.parent_id ? String(m.parent_id) : undefined,
        photoUrl: m.photo_path ? `${base}/uploads/${path.basename(m.photo_path)}` : undefined
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/profile', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { history, vision, mission } = req.body;
    if (history !== undefined) await run('UPDATE club_profile SET history = ? WHERE id = 1', [history]);
    if (vision !== undefined) await run('UPDATE club_profile SET vision = ? WHERE id = 1', [vision]);
    if (Array.isArray(mission)) {
      await run('DELETE FROM missions WHERE profile_id = 1');
      for (let i = 0; i < mission.length; i++) {
        await run('INSERT INTO missions (profile_id, position, text) VALUES (1, ?, ?)', [i, mission[i] || '']);
      }
    }
    const profile = await get('SELECT history, vision FROM club_profile WHERE id = 1');
    const missions = await all('SELECT text FROM missions WHERE profile_id = 1 ORDER BY position');
    res.json({
      history: profile?.history || '',
      vision: profile?.vision || '',
      mission: missions.map(m => m.text)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profile/structure', authMiddleware, adminOnly, upload.single('photo'), async (req, res) => {
  try {
    const { id, name, role, parentId } = req.body;
    const photoPath = req.file ? path.join(UPLOAD_DIR, req.file.filename) : null;
    if (id) {
      const existing = await get('SELECT id FROM organization_members WHERE id = ?', [id]);
      if (existing) {
        if (photoPath) await run('UPDATE organization_members SET name = ?, role = ?, parent_id = ?, photo_path = ? WHERE id = ?', [name, role, parentId || null, photoPath, id]);
        else await run('UPDATE organization_members SET name = ?, role = ?, parent_id = ? WHERE id = ?', [name, role, parentId || null, id]);
        const row = await get('SELECT id, name, role, parent_id, photo_path FROM organization_members WHERE id = ?', [id]);
        const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
        return res.json({ id: String(row.id), name: row.name, role: row.role, parentId: row.parent_id ? String(row.parent_id) : undefined, photoUrl: row.photo_path ? `${base}/uploads/${path.basename(row.photo_path)}` : undefined });
      }
    }
    const { insertId } = await run('INSERT INTO organization_members (profile_id, name, role, parent_id, photo_path) VALUES (1, ?, ?, ?, ?)', [name, role, parentId || null, photoPath]);
    const row = await get('SELECT id, name, role, parent_id, photo_path FROM organization_members WHERE id = ?', [insertId]);
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({ id: String(row.id), name: row.name, role: row.role, parentId: row.parent_id ? String(row.parent_id) : undefined, photoUrl: row.photo_path ? `${base}/uploads/${path.basename(row.photo_path)}` : undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/profile/structure/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await run('DELETE FROM organization_members WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- ACHIEVEMENTS ----
app.get('/api/achievements', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT id, title, year, description, photo_path FROM achievements ORDER BY id DESC');
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.json(rows.map(r => ({
      id: String(r.id),
      title: r.title,
      year: r.year,
      description: r.description || '',
      photoUrl: r.photo_path ? `${base}/uploads/${path.basename(r.photo_path)}` : undefined
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/achievements', authMiddleware, adminOnly, upload.single('photo'), async (req, res) => {
  try {
    const { id, title, year, description } = req.body;
    const photoPath = req.file ? path.join(UPLOAD_DIR, req.file.filename) : null;
    if (id) {
      const existing = await get('SELECT id FROM achievements WHERE id = ?', [id]);
      if (existing) {
        if (photoPath) await run('UPDATE achievements SET title = ?, year = ?, description = ?, photo_path = ? WHERE id = ?', [title, year, description || '', photoPath, id]);
        else await run('UPDATE achievements SET title = ?, year = ?, description = ? WHERE id = ?', [title, year, description || '', id]);
        const row = await get('SELECT id, title, year, description, photo_path FROM achievements WHERE id = ?', [id]);
        const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
        return res.json({ id: String(row.id), title: row.title, year: row.year, description: row.description || '', photoUrl: row.photo_path ? `${base}/uploads/${path.basename(row.photo_path)}` : undefined });
      }
    }
    const { insertId } = await run('INSERT INTO achievements (title, year, description, photo_path, created_by) VALUES (?, ?, ?, ?, ?)', [title, year, description || '', photoPath, req.user.id]);
    const row = await get('SELECT id, title, year, description, photo_path FROM achievements WHERE id = ?', [insertId]);
    const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({ id: String(row.id), title: row.title, year: row.year, description: row.description || '', photoUrl: row.photo_path ? `${base}/uploads/${path.basename(row.photo_path)}` : undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/achievements/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const row = await get('SELECT photo_path FROM achievements WHERE id = ?', [req.params.id]);
    if (row?.photo_path) try { fs.unlinkSync(row.photo_path); } catch (_) {}
    await run('DELETE FROM achievements WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log('Server running on port', PORT));
  })
  .catch(err => {
    console.error('Database init failed:', err.message);
    process.exit(1);
  });
