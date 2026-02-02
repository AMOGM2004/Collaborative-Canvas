class DrawingState {
    constructor() {
        this.strokes = []; // All strokes from all users
        this.users = new Map(); // socket.id -> user info
        this.userColors = {}; // Track colors assigned to users
        this.availableColors = [
            '#FF3B30', // Red
            '#4CD964', // Green
            '#007AFF', // Blue
            '#FF9500', // Orange
            '#5856D6', // Purple
            '#FF2D55', // Pink
            '#5AC8FA', // Light Blue
            '#FFCC00'  // Yellow
        ];
    }

    // Add a new user and assign them a color
    addUser(socketId, userInfo = {}) {
        const color = this.assignColor();
        const user = {
            id: socketId,
            color: color,
            cursor: { x: 0, y: 0, visible: false },
            ...userInfo
        };
        
        this.users.set(socketId, user);
        this.userColors[socketId] = color;
        
        return user;
    }

    // Remove a user
    removeUser(socketId) {
        this.users.delete(socketId);
        delete this.userColors[socketId];
    }

    // Assign a unique color to a user
    assignColor() {
        const usedColors = Object.values(this.userColors);
        
        // Find first available color
        for (const color of this.availableColors) {
            if (!usedColors.includes(color)) {
                return color;
            }
        }
        
        // If all colors are used, generate random one
        return `#${Math.floor(Math.random()*16777215).toString(16)}`;
    }

    // Add a drawing stroke
    addStroke(stroke) {
        // Add timestamp if not present
        if (!stroke.timestamp) {
            stroke.timestamp = Date.now();
        }
        
        // Add to strokes array
        this.strokes.push(stroke);
        
        // Keep only last 1000 strokes to prevent memory issues
        if (this.strokes.length > 1000) {
            this.strokes = this.strokes.slice(-500);
        }
        
        return stroke;
    }

    // Update user cursor position
    updateCursor(socketId, cursorData) {
        const user = this.users.get(socketId);
        if (user) {
            user.cursor = {
                ...user.cursor,
                ...cursorData,
                lastUpdate: Date.now()
            };
        }
    }

    // Get all strokes (with optional filtering)
    getStrokes(sinceTimestamp = 0) {
        return this.strokes.filter(stroke => stroke.timestamp > sinceTimestamp);
    }

    // Get all users (excluding one if specified)
    getUsers(excludeSocketId = null) {
        const users = {};
        
        this.users.forEach((user, socketId) => {
            if (socketId !== excludeSocketId) {
                users[socketId] = { ...user };
            }
        });
        
        return users;
    }

    // Clear all strokes
    clearCanvas() {
        this.strokes = [];
    }

    // Get user by socket ID
    getUser(socketId) {
        return this.users.get(socketId);
    }

    // Change user color
    changeUserColor(socketId, color) {
        const user = this.users.get(socketId);
        if (user) {
            user.color = color;
            this.userColors[socketId] = color;
            
            // Update all strokes by this user with new color
            this.strokes.forEach(stroke => {
                if (stroke.userId === socketId) {
                    stroke.color = color;
                }
            });
        }
    }

    // Get canvas snapshot
    getSnapshot() {
        return {
            strokes: this.strokes.slice(), // Return copy
            users: this.getUsers()
        };
    }
}

module.exports = DrawingState;