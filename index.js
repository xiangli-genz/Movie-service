require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.GATEWAY_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (cho avatar upload nếu dùng disk storage)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✓ Movie Service: Connected to MongoDB');
})
.catch(err => {
  console.error('✗ Movie Service: MongoDB connection error:', err);
  process.exit(1);
});

// ===== ROUTES =====
const apiRoutes = require('./routes/api/index.api');
app.use('/api/catalog', apiRoutes);

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'movie-service',
    timestamp: new Date().toISOString()
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Movie Service Error:', err);
  
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      code: 'error',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      code: 'error',
      message: 'API endpoint not found'
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✓ Movie Service running on port ${PORT}`);
  console.log(`✓ API available at: http://localhost:${PORT}/api/catalog`);
});

module.exports = app;