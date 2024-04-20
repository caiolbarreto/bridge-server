const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

const espCamURLs = [
  `http://192.168.131.101:8001`,
  `http://192.168.131.100:8002`,
];

const esp32URL = 'http://192.168.131.102:8001'


// Define routes
app.post('/send-to-esps/:clientID', async (req, res) => {
  try {
    // Forward the request to ESPs
    console.log('testing here', req.params)
    await sendToESPs(req.params);
    res.status(200).send('Request forwarded to ESPs successfully.');
    await fetchImageFromESP()
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

// Function to fetch image from an ESP
async function fetchImageFromESP(url) {
  try {
    const imageArray = [];

    // Loop through ESP URLs
    for (const url of espCamURLs) {
      // Set up interval for each URL
      setInterval(async () => {
        const response = await axios.get(`${url}/before`);
        if (response.data !== null) {
          imageArray.push(response.data);
        }
      }, 1000);

      // Execute handleOpenDoor function once for each URL
      await handleOpenDoor();
    }
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    return null; // Return null if there's an error
  }
}

async function handleOpenDoor() {
  try {
    const response = await axios.get(`${esp32URL}/open`)
    return response
  } catch (error) {
    console.error('Error forwarding request image from ESPs:', error);
  }
}

// Function to send request to ESPs
async function sendToESPs(data) {
  try {
    // Send request to each ESP asynchronously
    const requests = espCamURLs.map(url => axios.post(`${url}/auth?clientID=${data.clientID}`)
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
