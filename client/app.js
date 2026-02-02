// DOM Elements
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true }); // FIX: Added for performance
const cursorOverlay = document.getElementById('cursor-overlay');
const userCountSpan = document.getElementById('user-count');
const usersList = document.getElementById('users-list');
const myColorSpan = document.getElementById('my-color');
const brushSizeSlider = document.getElementById('brush-size');
const brushSizeValue = document.getElementById('brush-size-value');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const toolButtons = document.querySelectorAll('.tool-btn');
const colorOptions = document.querySelectorAll('.color-option');

// Drawing state
let drawing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let brushSize = 5;
let lastX = 0;
let lastY = 0;
let hue = 0;

// User state
let userId = null;
let userColor = '#000000';
let onlineUsers = {};

// History for undo/redo
let history = [];
let historyIndex = -1;

// Remote cursors
let remoteCursors = {};

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Redraw everything
    redrawCanvas();
}

// Initialize drawing context
function initCanvas() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
    
    // Set initial background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Initialize history
    saveToHistory();
}

// Save current canvas state to history
function saveToHistory() {
    // Save only the last 50 states
    if (history.length >= 50) {
        history.shift();
    }
    
    // Remove any states after current index (if we've undone and then drawn)
    history = history.slice(0, historyIndex + 1);
    
    // Save current canvas state
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    history.push(imageData);
    historyIndex = history.length - 1;
    
    updateUndoRedoButtons();
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

// Undo last action
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const imageData = history[historyIndex];
        ctx.putImageData(imageData, 0, 0);
        updateUndoRedoButtons();
    }
}

// Redo last undone action
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const imageData = history[historyIndex];
        ctx.putImageData(imageData, 0, 0);
        updateUndoRedoButtons();
    }
}

// Redraw canvas from history
function redrawCanvas() {
    if (historyIndex >= 0) {
        const imageData = history[historyIndex];
        ctx.putImageData(imageData, 0, 0);
    } else {
        // If no history, clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Start drawing
function startDrawing(e) {
    drawing = true;
    const coords = getCanvasCoordinates(e);
    [lastX, lastY] = [coords.x, coords.y];
    
    // For brush tool, draw a dot at start
    if (currentTool === 'brush') {
        ctx.beginPath();
        ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Send to server
        wsClient.sendDrawStart(lastX, lastY, brushSize, currentColor);
    } else if (currentTool === 'eraser') {
        ctx.beginPath();
        ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // Send to server (eraser as white brush)
        wsClient.sendDrawStart(lastX, lastY, brushSize, '#FFFFFF');
    }
}

// Draw
function draw(e) {
    if (!drawing) return;
    
    const coords = getCanvasCoordinates(e);
    const x = coords.x;
    const y = coords.y;
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    switch (currentTool) {
        case 'brush':
            ctx.strokeStyle = currentColor;
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Send to server
            wsClient.sendDraw(x, y, brushSize, currentColor);
            break;
            
        case 'eraser':
            ctx.strokeStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Send to server (eraser as white brush)
            wsClient.sendDraw(x, y, brushSize, '#FFFFFF');
            break;
    }
    
    // Send cursor position
    wsClient.sendCursorMove(x, y, true);
    
    [lastX, lastY] = [x, y];
}

// Stop drawing
function stopDrawing() {
    if (drawing) {
        drawing = false;
        ctx.closePath();
        
        // Send draw end to server
        wsClient.sendDrawEnd(lastX, lastY, brushSize, currentTool === 'eraser' ? '#FFFFFF' : currentColor);
        
        saveToHistory();
        
        // Hide cursor when not drawing
        wsClient.sendCursorMove(lastX, lastY, false);
    }
}

// Get coordinates relative to canvas
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if (e.type.includes('touch')) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    
    // Adjust for canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: x * scaleX,
        y: y * scaleY
    };
}

// Update brush size display
function updateBrushSize() {
    brushSize = parseInt(brushSizeSlider.value);
    brushSizeValue.textContent = `${brushSize}px`;
    ctx.lineWidth = brushSize;
}

// Change tool
function changeTool(tool) {
    currentTool = tool;
    
    // Update active button
    toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    // Handle special tools
    if (tool === 'clear') {
        if (confirm('Clear the entire canvas for all users?')) {
            // Clear local canvas
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Send clear to server
            wsClient.sendClearCanvas();
            
            // Save to history
            saveToHistory();
        }
        // Switch back to brush after clearing
        changeTool('brush');
    }
}

// Change color
function changeColor(color) {
    currentColor = color;
    
    // Update selected color
    colorOptions.forEach(option => {
        option.classList.toggle('selected', option.dataset.color === color);
    });
    
    // Update user color display and send to server
    if (userColor !== color) {
        userColor = color;
        myColorSpan.style.backgroundColor = color;
        wsClient.sendColorChange(color);
    }
}

// Handle remote drawing
// Handle remote drawing
function handleRemoteDrawing(stroke) {
    // Store remote strokes for continuous drawing
    if (!window.remoteStrokes) {
        window.remoteStrokes = new Map(); // userId -> {points: [], color, size}
    }
    
    const userId = stroke.userId;
    
    if (!window.remoteStrokes.has(userId)) {
        window.remoteStrokes.set(userId, {
            points: [],
            color: stroke.color || stroke.userColor || '#000000',
            size: stroke.size || brushSize,
            isDrawing: false
        });
    }
    
    const userStroke = window.remoteStrokes.get(userId);
    
    switch (stroke.type) {
        case 'stroke-start':
            // Start new stroke
            userStroke.points = [{x: stroke.x, y: stroke.y}];
            userStroke.color = stroke.color || stroke.userColor;
            userStroke.size = stroke.size || brushSize;
            userStroke.isDrawing = true;
            
            // Draw starting point
            drawRemotePoint(stroke.x, stroke.y, userStroke.color, userStroke.size);
            break;
            
        case 'stroke':
            if (userStroke.isDrawing && userStroke.points.length > 0) {
                const lastPoint = userStroke.points[userStroke.points.length - 1];
                const currentPoint = {x: stroke.x, y: stroke.y};
                
                // Draw line from last point to current point
                drawRemoteLine(
                    lastPoint.x, lastPoint.y,
                    currentPoint.x, currentPoint.y,
                    userStroke.color,
                    userStroke.size
                );
                
                // Store current point
                userStroke.points.push(currentPoint);
            }
            break;
            
        case 'stroke-end':
            // End the stroke
            userStroke.isDrawing = false;
            
            // Optional: Keep last few points for smoother transitions
            if (userStroke.points.length > 20) {
                userStroke.points = userStroke.points.slice(-10);
            }
            break;
    }
}

// Helper function to draw remote point
function drawRemotePoint(x, y, color, size) {
    const previousFillStyle = ctx.fillStyle;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = previousFillStyle;
}

// Helper function to draw remote line
function drawRemoteLine(x1, y1, x2, y2, color, size) {
    const previousStrokeStyle = ctx.strokeStyle;
    const previousLineWidth = ctx.lineWidth;
    const previousLineCap = ctx.lineCap;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Restore original settings
    ctx.strokeStyle = previousStrokeStyle;
    ctx.lineWidth = previousLineWidth;
    ctx.lineCap = previousLineCap;
}

// Update remote cursors
function updateRemoteCursors() {
    // Clear previous cursors
    cursorOverlay.innerHTML = '';
    
    // Get current remote cursors from WebSocket client
    const cursors = wsClient.getRemoteCursors();
    
    // Draw each remote cursor
    Object.values(cursors).forEach(cursor => {
        if (cursor.visible && cursor.userId !== userId) {
            const cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor';
            cursorEl.style.left = `${cursor.x}px`;
            cursorEl.style.top = `${cursor.y}px`;
            cursorEl.style.backgroundColor = cursor.color || '#FF0000';
            cursorEl.style.borderColor = cursor.color || '#FF0000';
            cursorEl.setAttribute('data-user', cursor.userId);
            
            // Add username label
            const label = document.createElement('div');
            label.className = 'cursor-label';
            label.textContent = `User ${cursor.userId ? cursor.userId.slice(0, 4) : '???'}`;
            label.style.color = cursor.color || '#FF0000';
            cursorEl.appendChild(label);
            
            cursorOverlay.appendChild(cursorEl);
        }
    });
    
    // Update users list
    updateUsersList();
}

// Update online users list
function updateUsersList() {
    usersList.innerHTML = '';
    
    // Add current user first
    const currentUserLi = document.createElement('li');
    currentUserLi.innerHTML = `
        <span class="user-color" style="background-color: ${userColor};"></span>
        <span><strong>You</strong> (${userId ? userId.slice(0, 4) : '???'})</span>
    `;
    usersList.appendChild(currentUserLi);
    
    // Add other users
    const cursors = wsClient.getRemoteCursors();
    Object.values(cursors).forEach(cursor => {
        if (cursor.userId !== userId) {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="user-color" style="background-color: ${cursor.color || '#FF0000'};"></span>
                <span>User ${cursor.userId ? cursor.userId.slice(0, 4) : '???'}</span>
            `;
            usersList.appendChild(li);
        }
    });
    
    // Update user count
    const totalUsers = 1 + Object.keys(cursors).length;
    userCountSpan.textContent = `${totalUsers} users online`;
}

// Initialize WebSocket event handlers
// Initialize WebSocket event handlers
function initWebSocketHandlers() {
  // Handle initialization
  window.addEventListener('user-init', (e) => {
    const data = e.detail;
    userId = data.userId;
    userColor = data.color;
    currentColor = userColor;
    
    console.log('User initialized:', userId, 'Color:', userColor);
    
    // Update UI
    myColorSpan.style.backgroundColor = userColor;
    changeColor(userColor);
    updateConnectionStatus(true);
  });
  
  // Handle user connections
  window.addEventListener('user-joined', (e) => {
    const data = e.detail;
    console.log('Remote user connected:', data.userId);
    showNotification(`User ${data.userId.slice(0, 4)} joined`, 'success');
    
    remoteCursors[data.userId] = {
      userId: data.userId,
      color: data.color,
      x: 0,
      y: 0,
      visible: false
    };
    
    updateUsersList();
  });
  
  // Handle remote drawing
  window.addEventListener('remote-draw', (e) => {
    const stroke = e.detail;
    // Handle drawing logic here...
    handleRemoteDrawing(stroke);
  });
  
  // Handle cursor movement
  window.addEventListener('cursor-move', (e) => {
    const data = e.detail;
    if (data.userId !== userId) {
      remoteCursors[data.userId] = {
        userId: data.userId,
        color: data.cursor.color || data.color || '#000000',
        x: data.cursor.x,
        y: data.cursor.y,
        visible: data.cursor.visible !== false
      };
      updateRemoteCursors();
    }
  });

   window.addEventListener('clear-canvas', () => {
    showNotification('Canvas cleared by another user', 'warning');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  });
}
    // Handle connection events
    wsClient.on('connected', () => {
        updateConnectionStatus(true);
    });
    
    wsClient.on('disconnected', () => {
        updateConnectionStatus(false);
    });
    
    wsClient.on('connection-error', (error) => {
        showNotification(`Connection error: ${error.message}`, 'error');
    });
    
    // Handle remote drawing
    wsClient.on('remote-draw-start', (stroke) => {
        handleRemoteDrawing(stroke);
    });
    
    wsClient.on('remote-draw', (stroke) => {
        handleRemoteDrawing(stroke);
    });
    
    wsClient.on('remote-draw-end', (stroke) => {
        handleRemoteDrawing(stroke);
        // Save to history when remote stroke ends
        saveToHistory();
    });
    
    // Handle remote cursor movement
    wsClient.on('remote-cursor-move', (data) => {
        if (data.userId !== userId) {
            remoteCursors[data.userId] = {
                userId: data.userId,
                color: data.cursor.color,
                x: data.cursor.x,
                y: data.cursor.y,
                visible: data.cursor.visible
            };
            updateRemoteCursors();
        }
    });
    
    // Handle user connections
    wsClient.on('user-connected', (data) => {
        console.log('Remote user connected:', data.userId);
        showNotification(`User ${data.userId.slice(0, 4)} joined`, 'success');
        
        remoteCursors[data.userId] = {
            userId: data.userId,
            color: data.color,
            x: 0,
            y: 0,
            visible: false
        };
        
        updateUsersList();
    });
    
    wsClient.on('user-disconnected', (data) => {
        console.log('Remote user disconnected:', data.userId);
        showNotification(`User ${data.userId.slice(0, 4)} left`, 'warning');
        
        delete remoteCursors[data.userId];
        updateRemoteCursors();
    });
    
    // Handle color changes
    wsClient.on('remote-color-change', (data) => {
        if (remoteCursors[data.userId]) {
            remoteCursors[data.userId].color = data.color;
            updateRemoteCursors();
        }
    });
    
    // Handle canvas clear
    wsClient.on('remote-clear-canvas', () => {
        showNotification('Canvas cleared by another user', 'warning');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
    });
}



// Connection status management
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
        showNotification('Connected to server', 'success');
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
        showNotification('Disconnected from server', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Update cursor overlay to handle canvas scaling
function updateRemoteCursors() {
    // Clear previous cursors
    cursorOverlay.innerHTML = '';
    
    // Get canvas position and scaling
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    // Draw each remote cursor
    Object.values(remoteCursors).forEach(cursor => {
        if (cursor.visible && cursor.userId !== userId) {
            // Convert canvas coordinates to screen coordinates
            const screenX = (cursor.x / scaleX) + canvasRect.left - canvas.offsetLeft;
            const screenY = (cursor.y / scaleY) + canvasRect.top - canvas.offsetTop;
            
            const cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor';
            cursorEl.style.left = `${screenX}px`;
            cursorEl.style.top = `${screenY}px`;
            cursorEl.style.backgroundColor = cursor.color || '#FF0000';
            cursorEl.style.borderColor = cursor.color || '#FF0000';
            cursorEl.setAttribute('data-user', cursor.userId);
            
            // Add username label
            const label = document.createElement('div');
            label.className = 'cursor-label';
            label.textContent = `User ${cursor.userId ? cursor.userId.slice(0, 4) : '???'}`;
            label.style.color = cursor.color || '#FF0000';
            cursorEl.appendChild(label);
            
            cursorOverlay.appendChild(cursorEl);
        }
    });
}

// Initialize event listeners
function initEventListeners() {
    // Canvas events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    
    // Brush size
    brushSizeSlider.addEventListener('input', updateBrushSize);
    
    // Tool buttons
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            changeTool(btn.dataset.tool);
        });
    });
    
    // Color options
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            changeColor(option.dataset.color);
        });
    });
    
    // Undo/Redo buttons
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    
    // Window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Send cursor position when moving (even when not drawing)
    canvas.addEventListener('mousemove', (e) => {
        if (!drawing) {
            const coords = getCanvasCoordinates(e);
            wsClient.sendCursorMove(coords.x, coords.y, true);
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        wsClient.sendCursorMove(0, 0, false);
    });
}

// Initialize the application
function init() {
    // Resize canvas to fit container
    resizeCanvas();
    
    // Initialize canvas context
    initCanvas();
    
    // Initialize WebSocket handlers
    initWebSocketHandlers();
    
    // Initialize event listeners
    initEventListeners();
    
    // Update brush size display
    updateBrushSize();
    
    console.log('Canvas application initialized with WebSocket support');
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Initializing Collaborative Canvas App...');
    
    // Initialize WebSocket client
    window.wsClient = new WebSocketClient();
    
    // Initialize drawing canvas
    window.drawingCanvas = new DrawingCanvas();
    
    // Check initialization after 1 second
    setTimeout(() => {
        if (window.wsClient.userId) {
            console.log('✅ App initialized successfully!');
            console.log('👤 Your User ID:', window.wsClient.userId);
            console.log('🎨 Your Color:', window.wsClient.userColor);
        }
    }, 1000);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!window.drawingCanvas) return;
    
    // Ctrl+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        window.drawingCanvas.undo();
    }
    
    // Ctrl+Y for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        window.drawingCanvas.redo();
    }
    
    // B for brush
    if (e.key === 'b' || e.key === 'B') {
        window.drawingCanvas.setTool('brush');
    }
    
    // E for eraser
    if (e.key === 'e' || e.key === 'E') {
        window.drawingCanvas.setTool('eraser');
    }
});