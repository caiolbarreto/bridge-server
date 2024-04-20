const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3001;

const espCamURLs = [
  `http://192.168.131.101:8001`,
  `http://192.168.131.102:8001`,
];

const esp32URL = 'http://192.168.131.100:8001'

const serverUrl = 'https://delicasa-server.onrender.com/files/many'

function addRandomNumber(filename, randomNumber) {
  let parts = filename.split('_');

  parts.splice(2, 0, randomNumber);

  let newFilename = parts.join('_');

  return newFilename;
}

// Define routes
app.post('/send-to-esps/:clientID', async (req, res) => {
  try {
    // Forward the request to ESPs
    console.log('testing here', req.params)
    await sendToESPs(req.params);
    res.status(200).send('Request forwarded to ESPs successfully.');
    const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    await fetchImageFromESP('before', randomNumber)
    await handleOpenDoor(randomNumber)
  } catch (error) {
    console.error('Error forwarding request to ESPs:', error);
    res.status(500).send('Internal server error.');
  }
});

// Function to fetch image from an ESP
async function fetchImageFromESP(state, randomNumber) {
  try {
    // Loop through ESP URLs
    const requests = espCamURLs.map(async url => {
      try {
        // Fetch image binary data
        const response = await axios.get(`${url}/${state}`, {
          responseType: 'arraybuffer' // Ensure binary data is correctly received
        }).then(async () => {
          // Extract the file name from the response headers
          const fileNameResponse = await axios.get(`${url}/filename-${state}`);
          const fileName = addRandomNumber(String(fileNameResponse.data), randomNumber);

          // Create FormData object and append image data with filename
          const form = new FormData();
          form.append('file', response.data, { filename: fileName });

          // Send the image to the server with the extracted file name
          console.log('fileName:', fileName);
          console.log('form:', form);

          await axios.post(serverUrl, form, {
            headers: {
              ...form.getHeaders() // Set proper headers for FormData
            }
          }).catch((error) => {
            console.error(error)
          })
        })

      } catch (error) {
        console.error(`Error sending request to ${url}:`, error);
        throw error; // Re-throw the error for handling in the catch block
      }
    });

    await Promise.all(requests);
  } catch (error) {
    console.error('Error fetching image from ESP:', error);
    return null; // Return null if there's an error
  }
}

async function handleOpenDoor(randomNumber) {
  try {
    const response = await axios.get(`${esp32URL}/open`)
    await monitorDoor(randomNumber)
    return response
  } catch (error) {
    console.error('Error forwarding request image from ESPs:', error);
  }
}

async function monitorDoor(randomNumber) {
  try {
    while (true) {
      const response = await axios.get(`${esp32URL}/closed`);
      if (response.data === "Porta fechada!") {
        // If the response is "Porta fechada!", call another function
        await fetchImageFromESP('after', randomNumber);
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
