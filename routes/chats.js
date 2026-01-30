const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { Chat } = require('../models/Chat');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

// Get all chats
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id })
      .sort({ updatedAt: -1 });

    res.render('chats/index', {
      user: req.user,
      chats
    });
  } catch (err) {
    console.error('Error fetching chats:', err);
    req.flash('error_msg', 'An error occurred while fetching chats');
    res.redirect('/dashboard');
  }
});

// Create new chat
router.get('/new', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Creating new chat for user:', req.user.id);

    const newChat = new Chat({
      title: 'New Chat',
      user: req.user.id,
      isAIChat: true,
      messages: [],
      participants: [req.user.id]
    });

    const savedChat = await newChat.save();
    console.log('New chat created:', savedChat._id);

    res.redirect(`/chats/${savedChat._id}`);
  } catch (err) {
    console.error('Error creating new chat:', err);
    req.flash('error_msg', 'An error occurred while creating a new chat');
    res.redirect('/dashboard');
  }
});

// Get single chat
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid chat ID format:', req.params.id);
      req.flash('error_msg', 'Invalid chat ID');
      return res.redirect('/dashboard');
    }

    console.log('Fetching chat:', req.params.id);
    const chat = await Chat.findById(req.params.id)
      .populate('messages.sender', 'name profilePicture userType');

    // Check if chat exists and belongs to user
    if (!chat) {
      console.log('Chat not found:', req.params.id);
      req.flash('error_msg', 'Chat not found');
      return res.redirect('/dashboard');
    }

    if (chat.user.toString() !== req.user.id) {
      console.log('Unauthorized access attempt. Chat user:', chat.user, 'Current user:', req.user.id);
      req.flash('error_msg', 'You do not have permission to view this chat');
      return res.redirect('/dashboard');
    }

    // Get all chats for sidebar
    const chats = await Chat.find({ user: req.user.id })
      .sort({ updatedAt: -1 });

    res.render('chats/chat', {
      user: req.user,
      chat,
      chats
    });
  } catch (err) {
    console.error('Error fetching chat:', err);
    req.flash('error_msg', 'An error occurred while loading the chat');
    res.redirect('/dashboard');
  }
});

// Update chat title
router.put('/:id/title', ensureAuthenticated, async (req, res) => {
  try {
    const { title } = req.body;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error_msg', 'Invalid chat ID');
      return res.redirect('/dashboard');
    }

    const chat = await Chat.findById(req.params.id);

    // Check if chat exists and belongs to user
    if (!chat || chat.user.toString() !== req.user.id) {
      req.flash('error_msg', 'Chat not found');
      return res.redirect('/dashboard');
    }

    chat.title = title;
    chat.updatedAt = Date.now();

    await chat.save();

    req.flash('success_msg', 'Chat title updated');
    res.redirect(`/chats/${chat.id}`);
  } catch (err) {
    console.error('Error updating chat title:', err);
    req.flash('error_msg', 'An error occurred while updating the chat title');
    res.redirect('/dashboard');
  }
});

// Delete chat
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error_msg', 'Invalid chat ID');
      return res.redirect('/dashboard');
    }

    const chat = await Chat.findById(req.params.id);

    // Check if chat exists and belongs to user
    if (!chat || chat.user.toString() !== req.user.id) {
      req.flash('error_msg', 'Chat not found');
      return res.redirect('/dashboard');
    }

    await Chat.deleteOne({ _id: req.params.id });

    req.flash('success_msg', 'Chat deleted');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error deleting chat:', err);
    req.flash('error_msg', 'An error occurred while deleting the chat');
    res.redirect('/dashboard');
  }
});

// Send message to AI
router.post('/:id/message', ensureAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(req.params.id);

    // Check if chat exists and belongs to user
    if (!chat || chat.user.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Add user message
    chat.messages.push({
      sender: req.user.id,
      content: message,
      timestamp: new Date()
    });

    // Get AI response from the legal advice service
    const aiResponse = await geminiService.getLegalAdvice(message);

    // Add AI message
    chat.messages.push({
      sender: null, // null sender indicates AI
      content: aiResponse,
      timestamp: new Date()
    });

    chat.updatedAt = Date.now();

    await chat.save();

    res.json({
      success: true,
      userMessage: {
        content: message,
        sender: {
          _id: req.user.id,
          name: req.user.name,
          profilePicture: req.user.profilePicture
        },
        timestamp: new Date()
      },
      aiMessage: {
        content: aiResponse,
        sender: null,
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'An error occurred while sending the message' });
  }
});

// Clear chat messages
router.post('/:id/clear', ensureAuthenticated, async (req, res) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(req.params.id);

    // Check if chat exists and belongs to user
    if (!chat || chat.user.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Clear messages array but keep the chat
    chat.messages = [];
    chat.updatedAt = Date.now();

    await chat.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing chat:', err);
    res.status(500).json({ error: 'An error occurred while clearing the chat' });
  }
});

module.exports = router;