const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const recommendationController = require('../controllers/recommendation.controller');
const chatbotController = require('../controllers/chatbot.controller');

// Track user behavior
router.post('/track', recommendationController.trackBehavior);

// Get recommendations
router.get('/recommendations', recommendationController.getRecommendations);

// Get user behavior history
router.get('/behavior/:maKH', recommendationController.getUserBehavior);

// Get statistics
router.get('/stats', recommendationController.getStats);

// Get detailed analytics for admin
router.get('/analytics', recommendationController.getAnalytics);

// Update behaviors without category
router.post('/update-behaviors-category', recommendationController.updateBehaviorsCategory);

// AI Chatbot endpoints
router.post('/chatbot/message', chatbotController.processMessage);

// Test endpoint - Check if service is working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Recommendation service is running',
        timestamp: new Date(),
        mongodb: {
            readyState: require('mongoose').connection.readyState,
            states: {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            }
        }
    });
});

module.exports = router;

