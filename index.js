const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const router = require('./router');

app.use(router);

server.listen(8080, () => {
    console.log('Server is listening on Port 8080');
});