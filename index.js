// index.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PAGE_ACCESS_TOKEN } = require('./config');

const FB_API_URL = 'https://graph.facebook.com/v11.0/me/messages';

// Function to load commands dynamically from the commands folder
function loadCommands() {
    const commandsDir = path.join(__dirname, 'commands');
    const commands = [];

    // Read all files in the commands directory
    fs.readdirSync(commandsDir).forEach(file => {
        const command = require(path.join(commandsDir, file));
        commands.push(command);
    });

    return commands;
}

// Function to generate the menu text based on loaded commands
function generateMenuText(commands) {
    let menuText = "📜 **Available Commands**:\n\n";

    commands.forEach(command => {
        menuText += `🔹 **${command.name}** - ${command.description}\n`;
    });

    menuText += `\n\n📘 **Guide**:\n`;
    commands.forEach(command => {
        menuText += `🔸 ${command.usage}\n`;
    });

    return menuText;
}

// Function to send a message to the user
async function sendMessage(recipientId, text) {
    await axios.post(
        FB_API_URL,
        {
            recipient: { id: recipientId },
            message: { text: text }
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
            }
        }
    );
}

// Function to handle the menu command
async function handleMenuCommand(recipientId) {
    const commands = loadCommands();
    const menuText = generateMenuText(commands);

    // Send the generated menu text to the user
    await sendMessage(recipientId, menuText);
}

// Example of handling incoming messages and checking if it's a "menu" command
async function handleMessage(event) {
    const senderId = event.sender.id;
    const message = event.message.text.trim();

    if (message.toLowerCase() === 'menu') {
        // If the user typed "menu", generate and send the menu
        await handleMenuCommand(senderId);
    } else {
        // Find and execute the specific command if available
        const commands = loadCommands();
        const [commandName, ...args] = message.split(' ');
        const command = commands.find(cmd => cmd.name === commandName.toLowerCase());

        if (command) {
            await command.execute(senderId, args);
        } else {
            await sendMessage(senderId, "Unknown command. Type 'menu' to see available commands.");
        }
    }
}

// Messenger Webhook Endpoint (Express app is required to receive messages)
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Webhook endpoint to handle incoming requests
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async function(entry) {
            const event = entry.messaging[0];
            if (event.message && event.message.text) {
                await handleMessage(event);
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Webhook verification endpoint
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

app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port', process.env.PORT || 3000);
});
