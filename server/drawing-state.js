class WebSocketClient {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.userColor = null;
        this.isConnected = false;
        this.onlineUsers = new Map();
        this.remoteCursors = new Map();
        
        this.connect();
    }
    
    connect() {
        // Connect to server (works for both local and Vercel)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.socket = io({ transports: ['websocket', 'polling'] });
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('disconnected');
        });
        
        // Server events (UPDATED EVENT NAMES)
        this.socket.on('init', (data) => {
            this.userId = data.userId;
            this.userColor = data.color;
            
            // Initialize user list
            data.users.forEach(user => {
                this.onlineUsers.set(user.id, user);
            });
            
            this.updateUserList();
            console.log('🎨 Initialized with user ID:', this.userId);
        });
        
        this.socket.on('user-joined', (user) => {
            this.onlineUsers.set(user.id, user);
            this.updateUserList();
            this.showNotification(`👤 User ${user.id.substring(0, 8)} joined`);
        });
        
        this.socket.on('user-left', (userId) => {
            this.onlineUsers.delete(userId);
            this.remoteCursors.delete(userId);
            this.updateUserList();
            this.showNotification(`👋 User ${userId.substring(0, 8)} left`);
        });
        
        this.socket.on('draw', (data) => {
            // Forward to drawing canvas
            if (window.drawingCanvas && data.userId !== this.userId) {
                window.drawingCanvas.drawRemote(data.stroke || data);
            }
        });
        
        this.socket.on('cursor-update', (data) => {
            // Update remote cursor position
            if (window.drawingCanvas && data.userId !== this.userId) {
                const user = this.onlineUsers.get(data.userId);
                if (user) {
                    window.drawingCanvas.updateCursor(data.userId, data.cursor, user.color);
                }
            }
        });
    }
    
    // Send drawing to server
    sendDraw(stroke) {
        if (this.socket && this.isConnected) {
            this.socket.emit('draw', {
                stroke: stroke,
                timestamp: Date.now()
            });
        }
    }
    
    // Send cursor position
    sendCursorMove(position) {
        if (this.socket && this.isConnected) {
            this.socket.emit('cursor-move', position);
        }
    }
    
    // Update connection status UI
    updateConnectionStatus(status) {
        const element = document.getElementById('connection-status');
        if (element) {
            element.className = status;
            
            const texts = {
                connecting: '🔗 Connecting...',
                connected: '✅ Connected',
                disconnected: '❌ Disconnected'
            };
            
            element.textContent = texts[status] || status;
        }
        
        // Update online count
        const onlineCount = this.onlineUsers.size;
        const countElement = document.getElementById('online-count');
        if (countElement) {
            countElement.textContent = onlineCount;
        }
    }
    
    // Update user list UI
    updateUserList() {
        const userList = document.getElementById('users-list');
        if (!userList) return;
        
        userList.innerHTML = '';
        
        // Add local user
        if (this.userId && this.userColor) {
            const userItem = document.createElement('li');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-color" style="background-color: ${this.userColor}"></div>
                <span class="user-name">You (${this.userId.substring(0, 8)})</span>
            `;
            userList.appendChild(userItem);
        }
        
        // Add other users
        this.onlineUsers.forEach((user, userId) => {
            if (userId !== this.userId) {
                const userItem = document.createElement('li');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <div class="user-color" style="background-color: ${user.color}"></div>
                    <span class="user-name">User ${userId.substring(0, 8)}</span>
                `;
                userList.appendChild(userItem);
            }
        });
    }
    
    // Show notification
    showNotification(message) {
        // Simple notification
        console.log('📢', message);
    }
    
    // Get user count
    getUserCount() {
        return this.onlineUsers.size;
    }
}

// Create global instance
window.WebSocketClient = WebSocketClient;