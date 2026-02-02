const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


// Serve static files from client folder
app.use(express.static(path.join(__dirname, '../client')));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Create drawing state manager
const drawingState = new DrawingState();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    
    // Add user to drawing state
    const user = drawingState.addUser(socket.id, {
        joinedAt: new Date().toISOString()
    });
    
    // Send existing state to new user
    socket.emit('init', {
        userId: socket.id,
        color: user.color,
        strokes: drawingState.getStrokes(),
        users: drawingState.getUsers(socket.id)
    });
    
    // Notify other users about new user
    socket.broadcast.emit('user-connected', {
        userId: socket.id,
        color: user.color,
        cursor: user.cursor
    });
    
    // Handle drawing events
    socket.on('draw-start', (data) => {
        // Add stroke to state
        const stroke = drawingState.addStroke({
            ...data,
            userId: socket.id,
            userColor: user.color,
            type: 'stroke-start'
        });
        
        // Broadcast to other users
        socket.broadcast.emit('remote-draw-start', stroke);
    });
    
    socket.on('draw', (data) => {
        // Update stroke in state
        const stroke = drawingState.addStroke({
            ...data,
            userId: socket.id,
            userColor: user.color,
            type: 'stroke'
        });
        
        // Broadcast to other users
        socket.broadcast.emit('remote-draw', stroke);
    });
    
    socket.on('draw-end', (data) => {
        // Complete stroke in state
        const stroke = drawingState.addStroke({
            ...data,
            userId: socket.id,
            userColor: user.color,
            type: 'stroke-end'
        });
        
        // Broadcast to other users
        socket.broadcast.emit('remote-draw-end', stroke);
    });
    
    // Handle cursor movement
    socket.on('cursor-move', (cursorData) => {
        drawingState.updateCursor(socket.id, cursorData);
        
        // Broadcast cursor position to other users
        socket.broadcast.emit('remote-cursor-move', {
            userId: socket.id,
            cursor: {
                ...cursorData,
                color: user.color
            }
        });
    });
    
    // Handle color changes
    socket.on('color-change', (color) => {
        drawingState.changeUserColor(socket.id, color);
        
        // Broadcast color change
        socket.broadcast.emit('remote-color-change', {
            userId: socket.id,
            color: color
        });
    });
    
    // Handle clear canvas
    socket.on('clear-canvas', () => {
        drawingState.clearCanvas();
        
        // Broadcast clear to all users
        io.emit('remote-clear-canvas');
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove user from state
        drawingState.removeUser(socket.id);
        
        // Notify other users
        socket.broadcast.emit('user-disconnected', {
            userId: socket.id
        });
    });
    
    // Handle undo/redo (for future implementation)
    socket.on('undo', () => {
        // TODO: Implement global undo
    });
    
    socket.on('redo', () => {
        // TODO: Implement global redo
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});