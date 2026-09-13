const mongoose = require('mongoose');

/*
  MongoDB, connected without making it a condition of starting.

  The database holds accounts, saved locations and persona choices. It holds
  no weather: every forecast, air-quality and marine reading comes from the
  upstream APIs and the in-memory caches. So a database outage should cost
  sign-in and saved lists, and nothing else.

  This used to `process.exit(1)` on a failed connect, which meant a transient
  DNS failure against the Atlas cluster took the entire weather service down
  with it - a dependency the weather path does not actually have. Now the
  server starts regardless, the driver keeps retrying in the background, and
  only the routes that genuinely need a database fail while it is away.
*/

let connected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mausam';

  // Fail fast rather than letting a request hang for the driver's default
  // 30 seconds: a caller that can degrade wants the bad news quickly.
  mongoose.connection.on('connected', () => {
    connected = true;
    console.log('✅ MongoDB connected');
  });
  mongoose.connection.on('disconnected', () => {
    connected = false;
    console.warn('⚠️  MongoDB disconnected — accounts and saved locations are unavailable');
  });

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    return true;
  } catch (error) {
    console.warn(
      `⚠️  MongoDB unavailable (${error.message}). Weather, air quality, alerts and search ` +
        'still work; sign-in and saved locations will not until it returns.',
    );
    return false;
  }
};

/** Whether account-backed routes can currently do their job. */
const isDatabaseReady = () => connected && mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDatabaseReady = isDatabaseReady;
