// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Simple JSON database file
const DB_FILE = path.join(__dirname, 'db.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ items: [] }, null, 2));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// uploads folder
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

// multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g,'_'));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, 'public')));

// API: get items (filter by type and approved)
app.get('/api/items', (req, res) => {
  const qtype = req.query.type; // 'found' or 'lost' or undefined for all
  const onlyApproved = req.query.approved === 'true';
  let items = readDB().items || [];
  if (qtype) items = items.filter(it => it.type === qtype);
  if (onlyApproved) items = items.filter(it => it.approved);
  res.json({ success:true, items });
});

// API: report item (multipart form for image + studentId image)
app.post('/api/report', upload.fields([{ name: 'itemImage' }, { name: 'studentIdImage' }]), (req, res) => {
  try {
    const { name, location, contact, desc, type, studentId ,category } = req.body;
    const itemImage = req.files['itemImage'] ? req.files['itemImage'][0].filename : null;
    const studentIdImage = req.files['studentIdImage'] ? req.files['studentIdImage'][0].filename : null;

    const db = readDB();
    const newItem = {
      id: 'it_' + Date.now(),
      name: name || 'Unknown',
      location: location || '',
      contact: contact || '',
      desc: desc || '',
      type: type || 'found', // 'found' or 'lost'
      category: category || 'Other',
      image: itemImage ? `/uploads/${itemImage}` : null,
      studentId: studentId || null,
      studentIdImage: studentIdImage ? `/uploads/${studentIdImage}` : null,
      approved: false,
      reportedAt: new Date().toISOString()
    };
    db.items.unshift(newItem);
    writeDB(db);

    // If reporting a FOUND item -> broadcast notification to all connected sockets
    if (newItem.type === 'found') {
      io.emit('notification', {
        title: 'New found item reported',
        msg: `${newItem.name} — ${newItem.location}`,
        item: newItem
      });
    }

    res.json({ success:true, item: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

// API: admin actions
app.post('/api/admin/approve/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const it = db.items.find(x => x.id === id);
  if (!it) return res.status(404).json({ success:false, error:'Not found' });
  it.approved = true;
  writeDB(db);
  res.json({ success:true, item: it });
});

app.post('/api/admin/reject/:id', (req,res) => {
  const id = req.params.id;
  let db = readDB();
  db.items = db.items.filter(x => x.id !== id);
  writeDB(db);
  res.json({ success:true });
});

// simple health
app.get('/api/health', (req,res) => res.json({ ok:true, time: new Date().toISOString() }));

// socket.io connection logging
io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected:', socket.id));
});

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
