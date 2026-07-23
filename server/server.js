require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const logsRouter = require('./routes/logs');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
  })
);
// 10mb limit comfortably covers a 10,000-record JSON batch (a record is
// roughly 250-300 bytes, so ~10k records is ~2.5-3MB).
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/logs', logsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Centralized error handler (catches anything thrown synchronously in a
// route/middleware that wasn't already handled with its own try/catch).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
