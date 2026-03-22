const mongoose = require('mongoose');
const connectDB = async (uri) => {
  try {
    console.log('🔗 Connecting to:', uri ? uri.substring(0, 40) + '...' : 'NO URI PROVIDED');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    console.log('📦 Database:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};
module.exports = connectDB;