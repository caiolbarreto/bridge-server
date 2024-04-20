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
    await handleGetImages()
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

async function handleGetImages() {
  try {
    const imageArray = []

    for (const url of espCamURLs) {
      setInterval(async () => {
        await axios.get(`${url}/before`).then((response) => {
          imageArray.push(response.data)
          console.log(response.data)
        }).catch((error) => {
          console.error(error)
        })
      }, 1000)
    }

    console.log('imageArray', imageArray.length)
    await handleOpenDoor()
  } catch (error) {
    console.error('Error forwarding request image from ESPs:', error);
    res.status(500).send('Internal server error')
  }
}

async function handleOpenDoor() {
  try {
    const response = await axios.get(`${esp32URL}/open`)
    res.status(200).send(`Opened, ${response.data}`)
  } catch (error) {
    console.error('Error forwarding request image from ESPs:', error);
    res.status(500).send('Internal server error')
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
