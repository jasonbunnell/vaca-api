const mongoose = require('mongoose');

function getMongoUri() {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vaca-api';
  const user = process.env.MONGODB_USERNAME;
  const pass = process.env.MONGODB_PASSWORD;
  // If username/password are set and URI has no credentials, inject them
  if (user && pass && !uri.includes('@')) {
    const encoded = encodeURIComponent(pass);
    uri = uri.replace(/^(mongodb(\+srv)?:\/\/)/, `$1${encodeURIComponent(user)}:${encoded}@`);
  }
  return uri;
}

const connectDB = async () => {
  try {
    const uri = getMongoUri();
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
