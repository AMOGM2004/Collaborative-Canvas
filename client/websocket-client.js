class WebSocketClient {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.userColor = null;
        this.isConnected = false;
        this.eventHandlers = new Map();
        this.remoteCursors = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Initialize connection
        this.init();
    }
    
    // Initialize WebSocket connection
    init() {
        // Create Socket.io connection
        this.socket = io();
        
        // Connection established
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emitEvent('connected', {});
        });
        
        // Initialize with server data
        this.socket.on('init', (data) => {
            console.log('Received initialization data:', data);
            this.userId = data.userId;
            this.userColor = data.color;
            this.emitEvent('init', data);
        });
        
        // Handle drawing events from other users
        this.socket.on('remote-draw-start', (stroke) => {
            this.emitEvent('remote-draw-start', stroke);
        });
        
        this.socket.on('remote-draw', (stroke) => {
            this.emitEvent('remote-draw', stroke);
        });
        
        this.socket.on('remote-draw-end', (stroke) => {
            this.emitEvent('remote-draw-end', stroke);
        });
        
        // Handle cursor movements from other users
        this.socket.on('remote-cursor-move', (data) => {
            this.remoteCursors[data.userId] = {
                ...data.cursor,
                userId: data.userId
            };
            this.emitEvent('remote-cursor-move', data);
        });
        
        // Handle user connections/disconnections
        this.socket.on('user-connected', (data) => {
            console.log('User connected:', data.userId);
            this.emitEvent('user-connected', data);
        });
        
        this.socket.on('user-disconnected', (data) => {
            console.log('User disconnected:', data.userId);
            delete this.remoteCursors[data.userId];
            this.emitEvent('user-disconnected', data);
        });
        
        // Handle color changes
        this.socket.on('remote-color-change', (data) => {
            this.emitEvent('remote-color-change', data);
        });
        
        // Handle canvas clear
        this.socket.on('remote-clear-canvas', () => {
            this.emitEvent('remote-clear-canvas', {});
        });
        
        // Handle disconnection
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.emitEvent('disconnected', {});
            this.attemptReconnect();
        });
        
        // Handle connection error
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.emitEvent('connection-error', error);
        });
    }
    
    // Attempt to reconnect
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                if (!this.isConnected) {
                    this.socket.connect();
                }
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.emitEvent('reconnection-failed', {});
        }
    }
    
    // Send drawing events to server
    sendDrawStart(x, y, size, color) {
        if (!this.isConnected) return;
        
        this.socket.emit('draw-start', {
            x, y, size, color,
            timestamp: Date.now()
        });
    }
    
    sendDraw(x, y, size, color) {
        if (!this.isConnected) return;
        
        this.socket.emit('draw', {
            x, y, size, color,
            timestamp: Date.now()
        });
    }
    
    sendDrawEnd(x, y, size, color) {
        if (!this.isConnected) return;
        
        this.socket.emit('draw-end', {
            x, y, size, color,
            timestamp: Date.now()
        });
    }
    
    // Send cursor position to server
    sendCursorMove(x, y, visible = true) {
        if (!this.isConnected) return;
        
        this.socket.emit('cursor-move', {
            x, y, visible,
            timestamp: Date.now()
        });
    }
    
    // Send color change to server
    sendColorChange(color) {
        if (!this.isConnected) return;
        
        this.userColor = color;
        this.socket.emit('color-change', color);
    }
    
    // Send clear canvas to server
    sendClearCanvas() {
        if (!this.isConnected) return;
        
        this.socket.emit('clear-canvas');
    }
    
    // Event handling
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emitEvent(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }
    
    // Get current user ID
    getUserId() {
        return this.userId;
    }
    
    // Get current user color
    getUserColor() {
        return this.userColor;
    }
    
    // Get connection status
    getConnectionStatus() {
        return this.isConnected;
    }
    
    // Get remote cursors
    getRemoteCursors() {
        return this.remoteCursors;
    }
    
    // Disconnect manually
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export singleton instance
const wsClient = new WebSocketClient();
window.wsClient = wsClient; // Make available globally for debugging