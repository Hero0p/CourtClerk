const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../middleware/auth');
const { Chat } = require('../models/Chat');

// Welcome Page
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('welcome', {
    layout: 'layouts/main',
    user: null
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Get user's chats
    const chats = await Chat.find({ user: req.user.id })
      .sort({ updatedAt: -1 });
    
    res.render('dashboard', {
      user: req.user,
      chats
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/');
  }
});

// Contact Us Page
router.get('/contact', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/users/login');
  }
  
  res.render('contact', {
    user: req.user
  });
});

module.exports = router; 