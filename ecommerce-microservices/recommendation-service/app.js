require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const recommendationRoutes = require('./src/routes/recommendation.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
// Database name: behavior
// Collection name: user-behavior
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI is not set in .env file!');
    console.error('❌ Please create a .env file with:');
    console.error('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/behavior?retryWrites=true&w=majority');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB (Recommendation Service)');
        console.log('📦 Database:', mongoose.connection.db.databaseName);
        console.log('📋 Collection: user-behavior');
        console.log('🔗 Connection URI:', MONGODB_URI.substring(0, 50) + '...');
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('❌ Please check your MONGODB_URI in .env file');
        console.error('❌ Connection URI format:', MONGODB_URI.substring(0, 50) + '...');
        process.exit(1);
    });

// Routes
app.use('/api/recommendation', recommendationRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'recommendation-service' });
});

const PORT = process.env.PORT || 3011;
app.listen(PORT, () => {
    console.log(`🚀 Recommendation service listening on port ${PORT}`);
});

