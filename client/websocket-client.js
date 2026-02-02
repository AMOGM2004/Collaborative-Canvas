class WebSocketClient {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.userColor = null;
    this.isConnected = false;
    this.remoteCursors = {};
    
    this.connect();
  }
  
  connect() {
    // Auto-detect URL for both local and Vercel
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
    });
    
    this.socket.on('init', (data) => {
      console.log('🎨 Initialized:', data.userId);
      this.userId = data.userId;
      this.userColor = data.color;
      window.dispatchEvent(new CustomEvent('user-init', { detail: data }));
    });
    
    this.socket.on('user-joined', (data) => {
      console.log('👤 User joined:', data.userId);
      window.dispatchEvent(new CustomEvent('user-joined', { detail: data }));
    });
    
    this.socket.on('user-left', (userId) => {
      console.log('👋 User left:', userId);
      delete this.remoteCursors[userId];
      window.dispatchEvent(new CustomEvent('user-left', { detail: { userId } }));
    });
    
    this.socket.on('draw', (data) => {
      window.dispatchEvent(new CustomEvent('remote-draw', { detail: data }));
    });
    
    this.socket.on('cursor-move', (data) => {
      this.remoteCursors[data.userId] = {
        ...data.cursor,
        userId: data.userId,
        color: data.color
      };
      window.dispatchEvent(new CustomEvent('cursor-move', { detail: data }));
    });
    
    this.socket.on('clear-canvas', () => {
      window.dispatchEvent(new CustomEvent('clear-canvas'));
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.isConnected = false;
    });
  }
  
  // Send drawing data
  sendDraw(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('draw', {
        ...data,
        timestamp: Date.now()
      });
    }
  }
  
  // Send cursor position
  sendCursorMove(x, y, visible = true) {
    if (this.socket && this.isConnected) {
      this.socket.emit('cursor-move', {
        x, y, visible,
        timestamp: Date.now()
      });
    }
  }
  
  // Send clear canvas
  sendClearCanvas() {
    if (this.socket && this.isConnected) {
      this.socket.emit('clear-canvas');
    }
  }
  
  // Get remote cursors
  getRemoteCursors() {
    return this.remoteCursors;
  }
}

// Create global instance
window.wsClient = new WebSocketClient();