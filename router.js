const app = require('express').Router(),
    mongoose = require('mongoose'),
    BookSchema = require('./models/bookSchema');
    // client = redis.createClient();

module.exports = app;

// client.on('error', function(err) {
//     console.log('Error: ' + err);
// });

app.get('/', (req, res, next) => {
    return res.status(200).send("You can get details of your book making a GET request to its id");
});

app.get('/api/:id', (req, res, next) => {
    let id = req.params.id;
    if (!id) {
        return res.status(300).send("Id Needed");
    }
    BookSchema.find({ tag: id }, (err, book) => {
        if (err)
            return next(err);
        if (!book)
            return res.status(404).send("No Book found");
        return res.status(200).send(book);
    });
});

app.post('/api/new', (req, res, next) => {
    let tag = req.body.tag;
    let bookName = req.body.bookName;
    let rowName = req.body.rowName;
    let rowId = req.body.rowId;
    console.log(req.body);
    var book = new BookSchema({
        tag,
        bookName,
        row: {
            rowName,
            rowId
        }
    });
    book.save((err, book) => {
        if (err) next(err);
        return res.status(200).send(book);
    });
});