const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler.middleware');
const { nodeEnv } = require('./config/env');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// Any /api path that didn't match a route above is a genuine 404, in every
// environment - it must never fall through to the SPA catch-all below.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

if (nodeEnv === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });
}

app.use(errorHandler);

module.exports = app;
