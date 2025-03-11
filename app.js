require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Socket.io setup
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Passport config
require('./config/passport')(passport);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/legal-ai-chat')
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// EJS setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override
app.use(methodOverride('_method'));

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/legal-ai-chat'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Handle chat message
  socket.on('chatMessage', async (data) => {
    try {
      // Save message to database
      const { Chat } = require('./models/Chat');
      const newMessage = {
        sender: data.sender,
        content: data.message,
        timestamp: new Date()
      };
      
      await Chat.findByIdAndUpdate(
        data.chatId,
        { $push: { messages: newMessage } }
      );
      
      // Emit message to client
      io.emit('message', {
        chatId: data.chatId,
        message: newMessage
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/chats', require('./routes/chats'));
app.use('/community', require('./routes/community'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    layout: 'layouts/main',
    user: req.user || null,
    error: err.message || 'Something went wrong!',
    status: 500
  });
});

// 404 handler - must be after all other routes
app.use((req, res) => {
  res.status(404).render('error', {
    layout: 'layouts/main',
    user: req.user || null,
    error: 'Page not found',
    status: 404
  });
});

// Start server
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 