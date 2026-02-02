const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// For Vercel deployment, configure CORS properly
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});

// Serve static files from client folder
app.use(express.static(path.join(__dirname, '../client')));

// Also serve socket.io client
app.use('/socket.io', express.static(path.join(__dirname, '../node_modules/socket.io/client-dist')));

// Handle all routes by sending index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Assign random color to user
  const userColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
  users.set(socket.id, {
    id: socket.id,
    color: userColor,
    cursor: { x: 0, y: 0, visible: false }
  });
  
  // Send current users to the new user (USE SIMPLE EVENT NAMES)
  socket.emit('init', {
    userId: socket.id,
    color: userColor,
    users: Array.from(users.values()).filter(u => u.id !== socket.id)
  });
  
  // Notify others about new user (USE SIMPLE EVENT NAMES)
  socket.broadcast.emit('user-joined', {
    userId: socket.id,
    color: userColor
  });
  
  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    users.delete(socket.id);
    socket.broadcast.emit('user-left', socket.id);
  });
  
  // Handle drawing events (USE SIMPLE EVENT NAMES)
  socket.on('draw', (data) => {
    // Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }
    
    // Broadcast to all other users
    socket.broadcast.emit('draw', {
      ...data,
      userId: socket.id
    });
  });
  
  // Handle cursor movement
  socket.on('cursor-move', (position) => {
    if (users.has(socket.id)) {
      users.get(socket.id).cursor = position;
      socket.broadcast.emit('cursor-move', {
        userId: socket.id,
        cursor: position,
        color: users.get(socket.id).color
      });
    }
  });
  
  // Handle clear canvas
  socket.on('clear-canvas', () => {
    // Broadcast clear to all users
    io.emit('clear-canvas');
  });
});

// For Vercel deployment
const PORT = process.env.PORT || 3000;

// Export for Vercel serverless
if (process.env.VERCEL) {
  module.exports = (req, res) => {
    // Handle HTTP requests
    app(req, res);
  };
  module.exports.server = server;
} else {
  // For local development
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  module.exports = server;
}