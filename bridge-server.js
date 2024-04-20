const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const espCamURLs = [
  `http://192.168.131.101:8001`,
  `http://192.168.131.100:8002`,
];

const esp32URL = 'http://192.168.131.102:8001'

const serverUrl = 'https://delicasa-server.onrender.com/files/many'

// Define routes
app.post('/send-to-esps/:clientID', async (req, res) => {
  try {
    // Forward the request to ESPs
    console.log('testing here', req.params)
    await sendToESPs(req.params);
    res.status(200).send('Request forwarded to ESPs successfully.');
    await fetchImageFromESP()
    await handleOpenDoor()
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

// Function to fetch image from an ESP
async function fetchImageFromESP(state) {
  try {
    const imageArray = [];

    // Loop through ESP URLs
    const requests = espCamURLs.map(url => axios.get(`${url}/${state}`)
      .then(async (response) => {
        // Extract the file name from the response headers
        const contentDisposition = response.headers['content-disposition'];
        const fileName = contentDisposition.split('filename=')[1].trim();

        // Send the image to the server with the extracted file name
        await axios.post(serverUrl, response.data, {
          headers: {
            'Content-Type': 'image/jpeg', // Assuming the content type is JPEG, change if different
            'Content-Disposition': `attachment; filename="${fileName}"` // Set the file name in the request headers
          }
        });
      })
      .catch(error => {
        console.error(`Error sending request to ${url}:`, error);
        throw error; // Re-throw the error for handling in the catch block
      }));
    await Promise.all(requests);
  } catch (error) {
    console.error('Error fetching image from ESP:', error);
    return null; // Return null if there's an error
  }
}

async function handleOpenDoor() {
  try {
    const response = await axios.get(`${esp32URL}/open`)
    await monitorDoor()
    return response
  } catch (error) {
    console.error('Error forwarding request image from ESPs:', error);
  }
}

async function monitorDoor() {
  try {
    while (true) {
      const response = await axios.get(`${esp32URL}/close`);
      if (response.data === "Porta fechada!") {
        // If the response is "Porta fechada!", call another function
        await fetchImageFromESP('/after');
        break; // Exit the loop
      }
      // Delay before sending the next request
      await delay(1000); // Adjust delay time as needed
    }
  } catch (error) {
    console.error('Error monitoring door status:', error);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
