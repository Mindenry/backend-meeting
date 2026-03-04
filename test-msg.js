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
