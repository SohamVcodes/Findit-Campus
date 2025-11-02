// server.js
const express = require('express');
const path = require('path');
const app = express();

// Use environment port (Render) or 10000 locally
const PORT = process.env.PORT || 10000;

// Middleware to serve static files (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// Default route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
