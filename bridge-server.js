const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Define routes
app.post('/send-to-esps', async (req, res) => {
  try {
    // Forward the request to ESPs
    console.log('testing here', JSON.stringify(req))
    await sendToESPs(JSON.stringify(req.body));
    res.status(200).send('Request forwarded to ESPs successfully.');
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

// Testing route
app.get('/testing', async (_req, res) => {
    try {
      res.status(200).send('Server is running');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error.');
    }
  });

// Testing route
app.get('/esp', async (_req, res) => {
  try {
    const axiosResponse = await axios.get('http://192.168.1.100:8001/init');
    // Send the data property of the axios response as the response to the client
    res.status(200).json(axiosResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error.');
  }
});

// Function to send request to ESPs
async function sendToESPs(data) {
  const espURLs = [
    'http://192.168.1.100:8001/auth'
    // Add URLs for other ESPs here
  ];

  try {
    // Send request to each ESP asynchronously
    const requests = espURLs.map(url => axios.post(url, data)
      .catch(error => {
        console.error(`Error sending request to ${url}:`, error);
        throw error; // Re-throw the error for handling in the catch block
      }));
    await Promise.all(requests);
    console.log('Requests sent to ESPs successfully.');
  } catch (error) {
    console.error('Error sending requests to ESPs:', error);
    throw error; // Re-throw the error for handling in the caller function
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
