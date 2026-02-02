## 🎨 Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on a shared canvas.  
Built using **HTML5 Canvas, Node.js, Express, and Socket.io**, this project demonstrates real-time communication using **WebSockets** with a clean and intuitive user experience.

---

## ✨ Features

### 🖌 Core Functionality
- Real-time drawing synchronization across all connected users
- Brush and eraser tools
- Adjustable brush size
- Individual color selection per user
- Live cursor tracking with user labels
- Canvas clear action synchronized for all users

---

### 👥 User Experience
- User join and leave notifications
- Connection status indicator
- Responsive layout
- Mobile and touch device support
- Clean and intuitive user interface

---

## 🛠️ Technologies Used

### Frontend
- HTML5
- Canvas API
- JavaScript
- CSS3

### Backend
- Node.js
- Express.js
- Socket.io

### Real-Time Communication
- WebSockets (via Socket.io)

---


## 📁 Project Structure
```
collaborative-canvas/
├── client/
│ ├── index.html # Main HTML file
│ ├── style.css # Application styles
│ ├── app.js # Canvas and drawing logic
│ └── websocket-client.js # Socket.io client handling
│
├── server/
│ ├── server.js # Express + Socket.io server
│ └── drawing-state.js # Shared canvas state logic
│
├── package.json # Project dependencies & scripts
├── README.md # Project documentation
└── ARCHITECTURE.md # System architecture overview
```

---
## 🚀 Getting Started

Follow the steps below to run the project locally on your computer.

## ✅ Prerequisites

### 📦 Step 1: Install Node.js (Very Important)

This project uses **Node.js**, which allows JavaScript to run outside the browser.

#### 👉 How to download and install Node.js

1. Open your web browser
2. Go to: **https://nodejs.org**
3. Download the **LTS (Recommended)** version
4. Open the downloaded file
5. Install it using **Next → Next → Finish**

⚠️ **Important:**  
Do **NOT** change any default settings during installation.


### ✅ Step 2: Verify Installation

After installing Node.js, make sure it was installed correctly.

#### 🔹 On Windows

1. Press **Windows + R**
2. Type `cmd` and press **Enter**

#### 🔹 On macOS / Linux

1. Open **Terminal**
Now type the following commands **one by one**:
```bash
node -v
npm -v
```
✔ If version numbers appear (example: v18.17.0), the installation was successful
❌ If not, restart your system and try again

---

## ⚙️ Installation

### 1. Clone the Repository

Open your terminal and run the following commands:
```bash
git clone https://github.com/AMOGM2004/Collaborative-Canvas.git
cd collaborative-canvas
```
### 2. Install Dependencies

Run the following command in your terminal to install all required packages:

```bash
npm install
```

### 3. Start the Server
Start the application with:
```bash
npm start
```

### 4. (Optional) Development Mode (Auto Restart) :
For development with automatic server restart on file changes, run:
```bash
npm run dev
```

### 5. 🚀 Open in Browser
Open your browser and navigate to: http://localhost:3000

---

## 🧪 Testing with Multiple Users

To see real-time collaboration in action:

1. Open the application in one browser tab or window
2. Open the **same URL** in another tab or a different browser
3. Draw on one canvas — it will appear in real time on the other
4. Watch other users’ cursors move as they draw
5. Try different colors and brush sizes

---

## 🤝 Contributing & Support

Contributions are welcome and appreciated. 

If you find this project useful, you can star ⭐ the repository, fork 🍴 it, and submit pull requests for improvements or fixes.

---



