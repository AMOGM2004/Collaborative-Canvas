## 🎨 Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas.

## Features
- Real-time drawing synchronization
- Multiple drawing tools (brush, eraser)
- Adjustable brush size and colors
- Undo/Redo functionality
- Online user indicators
- Mobile touch support
 
---

## User Experience
- User join/leave notifications
- Connection status indicator
- Responsive layout
- Mobile and touch device support
- Clean and intuitive UI

---

## 🛠️ Technologies Used

## Frontend
- HTML5 Canvas
- Vanilla JavaScript
- CSS3
  
## Backend
- Node.js
- Express.js
- Socket.io
  
## Real-Time Communication
- WebSockets via Socket.io

---

## 📁 Project Structure
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Application styles
│   ├── app.js              # Canvas and drawing logic
│   └── websocket-client.js # Socket.io client handling
│
├── server/
│   ├── server.js           # Express + Socket.io server
│   └── drawing-state.js    # Shared canvas state logic
│
├── package.json            # Project dependencies & scripts
├── README.md               # Project documentation
└── ARCHITECTURE.md         # System architecture overview


---

🚀 Getting Started
Follow these steps to run the project locally.

✅ Prerequisites
Node.js v14 or higher
npm (comes with Node.js)

Check versions:
- node -v
- npm -v

---

## 📦 Installation

Clone the repository : git clone https://github.com/AMOGM2004/collaborative-canvas.git
Navigate to the project folder : cd collaborative-canvas
Install dependencies : npm install
Start the server and run the application : npm start
For development (auto-restart on changes): npm run dev

Open your browser and visit: 
http://localhost:3000

---

## 🧪 Testing with Multiple Users
Open the app in one browser tab
Open the same URL in another tab or a different browser
Draw on one canvas — changes appear instantly everywhere
Observe live cursor movements
Try different colors and brush sizes

---
## Testing Tips
Test on Chrome, Firefox, and Edge
Use a mobile device to verify touch support
Draw rapidly to test real-time performance
Refresh or reconnect to test session recovery



git clone <repository-url>
cd collaborative-canvas
