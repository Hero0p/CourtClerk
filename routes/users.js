const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const { forwardAuthenticated } = require('../middleware/auth');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('login', {
    layout: 'layouts/main',
    user: null
  });
});

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => {
  res.render('register', {
    layout: 'layouts/main',
    user: null
  });
});

// Register Handle
router.post('/register', async (req, res) => {
  const { name, email, password, password2, userType } = req.body;
  let errors = [];

  // Check required fields
  if (!name || !email || !password || !password2 || !userType) {
    errors.push({ msg: 'Please fill in all fields' });
  }

  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // Check password length
  if (password.length < 6) {
    errors.push({ msg: 'Password should be at least 6 characters' });
  }

  // Check user type
  if (userType !== 'client' && userType !== 'lawyer') {
    errors.push({ msg: 'Invalid user type' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      userType
    });
  } else {
    try {
      // Check if user exists
      const existingUser = await User.findOne({ email: email });
      
      if (existingUser) {
        errors.push({ msg: 'Email is already registered' });
        return res.render('register', {
          errors,
          name,
          email,
          userType
        });
      }

      // Create new user
      const newUser = new User({
        name,
        email,
        password,
        userType
      });

      // Hash Password
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, async (err, hash) => {
          if (err) throw err;
          
          // Set password to hashed
          newUser.password = hash;
          
          // Save user
          await newUser.save();
          
          req.flash('success_msg', 'You are now registered and can log in');
          res.redirect('/users/login');
        });
      });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred during registration');
      res.redirect('/users/register');
    }
  }
});

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
  });
});

// Profile Page
router.get('/profile', (req, res) => {
  res.render('profile', {
    user: req.user
  });
});

// Update Profile
router.post('/profile', async (req, res) => {
  try {
    const { name, bio, specialization, hourlyRate, location } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      name,
      bio,
      specialization,
      hourlyRate,
      location
    });
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while updating profile');
    res.redirect('/users/profile');
  }
});

module.exports = router; 