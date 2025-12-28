const express = require('express')
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const database = require('./config/database');
const apiRoutes = require('./routes/api/index.api');
const variablesConfig = require('./config/variable');

const app = express()
const port = 3002

//kết nối database
database.connect();

// Enable CORS
app.use(cors());

// Cho phép gửi từ data lên json
app.use(express.json());

// Thiết lập đường dẫn
app.use('/api/catalog', apiRoutes);  // Mount API routes

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// Global error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});