const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Store connected users
const users = new Map();
const drawingState = new DrawingState();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    const userColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    users.set(socket.id, { id: socket.id, color: userColor });
    
    socket.emit('init', { 
        userId: socket.id, 
        color: userColor,
        users: Array.from(users.values())
    });
    
    socket.broadcast.emit('user-joined', users.get(socket.id));
    
    socket.on('disconnect', () => {
        users.delete(socket.id);
        socket.broadcast.emit('user-left', socket.id);
    });
    
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', { ...data, userId: socket.id });
    });
    
    socket.on('cursor-move', (position) => {
        socket.broadcast.emit('cursor-update', {
            userId: socket.id,
            cursor: position
        });
    });
});

// For Vercel
const PORT = process.env.PORT || 3000;

// Export for Vercel serverless
if (process.env.VERCEL) {
    module.exports = (req, res) => {
        // Handle HTTP requests
        app(req, res);
    };
} else {
    // For local development
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    module.exports = server;
}