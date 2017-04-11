const http = require('http'),
    express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    app = express(),
    server = http.createServer(app),
    router = require('./router');

mongoose.connect(process.env.DATABASE_URL, (err) => {
    if (err) throw err;
    else console.log('Connected');
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(router);


server.listen(8080, () => {
    console.log('Server is listening on Port 8080');
});