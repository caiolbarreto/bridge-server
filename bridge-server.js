const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Define routes
app.post('/send-to-esps', async (req, res) => {
  try {
    // Forward the request to ESPs
    await sendToESPs(req.body);
    res.status(200).send('Request forwarded to ESPs successfully.');
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

// Testing route
app.post('/testing', async (_req, res) => {
    try {
      res.status(200).send('Server is running');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error.');
    }
  });

// Function to send request to ESPs
async function sendToESPs(data) {
  // Assuming you have 6 ESPs running locally with different URLs
  const espURLs = [
    'http://localhost:8001',
    'http://localhost:8002',
    // Add URLs for other ESPs here
  ];

  // Send request to each ESP asynchronously
  const requests = espURLs.map(url => axios.post(url, data));
  await Promise.all(requests);
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
