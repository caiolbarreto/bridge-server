const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3001;

const espCamURLs = [
  { url: 'http://192.168.131.101:8001', randomNumber: null },
  { url: 'http://192.168.131.102:8001', randomNumber: null },
];

const esp32URL = 'http://192.168.131.100:8001';

const serverUrl = 'https://delicasa-server.onrender.com/files/many';

function addRandomNumber(filename, randomNumber) {
  let parts = filename.split('_');
  parts.splice(2, 0, randomNumber);
  return parts.join('_');
}

// Define routes
app.post('/send-to-esps/:clientID', async (req, res) => {
  try {
    const clientID = req.params.clientID;
    // Generate a random number for each ESP link
    espCamURLs.forEach(esp => {
      esp.randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    });

    // Forward the request to ESPs
    await sendToESPs(clientID);
    res.status(200).send('Request forwarded to ESPs successfully.');

    // Process images before and after opening the door for each ESP
    await Promise.all(espCamURLs.map(async esp => {
      await fetchImageFromESP(esp.url, 'before', esp.randomNumber);
      await handleOpenDoor(esp.url, esp.randomNumber);
    }));
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

// Function to fetch image from an ESP
async function fetchImageFromESP(url, state, randomNumber) {
  try {
    // Fetch image binary data
    const response = await axios.get(`${url}/${state}`, {
      responseType: 'arraybuffer' // Ensure binary data is correctly received
    });

    // Extract the file name from the response headers
    const fileNameResponse = await axios.get(`${url}/filename-${state}`);
    const fileName = addRandomNumber(String(fileNameResponse.data), randomNumber);

    // Create FormData object and append image data with filename
    const form = new FormData();
    form.append('file', response.data, { filename: fileName });

    // Send the image to the server with the extracted file name
    await axios.post(serverUrl, form, {
      headers: {
        ...form.getHeaders() // Set proper headers for FormData
      }
    });
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    throw error;
  }
}

async function handleOpenDoor(url, randomNumber) {
  try {
    const response = await axios.get(`${esp32URL}/open`);
    await monitorDoor(url, randomNumber);
    return response;
  } catch (error) {
    console.error('Error opening the door:', error);
  }
}

async function monitorDoor(url, randomNumber) {
  try {
    while (true) {
      const response = await axios.get(`${esp32URL}/closed`);
      if (response.data === "Porta fechada!") {
          await fetchImageFromESP(url, 'after', randomNumber);
        break;
      }
      await delay(1000);
    }
  } catch (error) {
    console.error('Error monitoring door status:', error);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to send request to ESPs
async function sendToESPs(clientID) {
  try {
    await Promise.all(espCamURLs.map(async esp => {
      await axios.post(`${esp.url}/auth?clientID=${clientID}`);
    }));
    console.log('Requests sent to ESPs successfully.');
  } catch (error) {
    console.error('Error sending requests to ESPs:', error);
    throw error;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
