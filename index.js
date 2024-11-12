const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { PAGE_ACCESS_TOKEN } = require('./config');

const app = express();
app.use(bodyParser.json());

const FB_API_URL = 'https://graph.facebook.com/v11.0/me/messages';

// Function to send a message to the user
async function sendMessage(recipientId, message) {
    await axios.post(
        FB_API_URL,
        {
            recipient: { id: recipientId },
            message: message
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
            }
        }
    );
}

// Function to handle the "Get Started" payload
async function handleGetStarted(recipientId) {
    // Step 1: Send the image
    const imageMessage = {
        attachment: {
            type: "image",
            payload: {
                url: "https://your-image-url.com/image.jpg", // Replace with your image URL
                is_reusable: true
            }
        }
    };
    await sendMessage(recipientId, imageMessage);

    // Step 2: Send the text message with a grey background effect
    const textMessage = {
        text: "Welcome to our Messenger Bot! We're here to help you get started. Type 'menu' to see available commands.",
        quick_replies: [
            {
                content_type: "text",
                title: "Menu",
                payload: "MENU"
            }
        ]
    };
    await sendMessage(recipientId, textMessage);
}

// Auto-seen functionality
async function markSeen(recipientId) {
    await axios.post(
        FB_API_URL,
        {
            recipient: { id: recipientId },
            sender_action: "mark_seen"
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
            }
        }
    );
}

// Handle incoming messages
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async function(entry) {
            const event = entry.messaging[0];
            const senderId = event.sender.id;

            // Automatically mark message as "seen"
            await markSeen(senderId);

            if (event.postback && event.postback.payload === 'GET_STARTED') {
                await handleGetStarted(senderId);
            }
            // Handle other commands like "menu" here
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Webhook verification (required by Facebook)
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = 'pagebot';

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Start the server
app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port', process.env.PORT || 3000);
});
