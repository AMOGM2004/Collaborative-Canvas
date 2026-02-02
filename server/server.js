const express = require('express');
const app = express();

// Serve static files
app.use(express.static('client'));

// Simple route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../client/index.html');
});

// WebSocket not needed for basic deployment test
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;