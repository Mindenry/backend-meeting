#!/bin/bash
TOKEN=$(sqlite3 /Users/mind/Documents/GitHub/team-connect/backend-meeting/prisma/dev.db "SELECT id FROM User LIMIT 1;")
export JWT_SECRET="your-secret-key"

# Just send a simple REST request via node instead so we can see the exact validation error msg
cat << 'JS' > test-msg.js
const http = require('http');

const data = JSON.stringify({
  senderId: process.env.USER_ID || "123",
  text: "",
  attachments: [{
    url: "http://localhost:3000/uploads/test.png",
    name: "test.png",
    type: "image/png"
  }]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/channels/21d0af12-6501-47dd-a118-6642fc316d61/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
JS
node test-msg.js
