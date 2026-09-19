const app = require('./src/app');
const connectDB = require('./src/config/db');
const { port } = require('./src/config/env');

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`[server] YogiTrack API listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
