const app = require('express').Router(),
    url = require('url'),
    mongoose = require('mongoose'),
    BookSchema = require('./models/bookSchema');

module.exports = app;

app.get('/', (req, res, next) => {
    return res.status(200).send("You can get details of your book making a GET request to its id");
});

app.get('/api/id/:id', (req, res, next) => {
    let id = req.params.id;
    if (!id) {
        return res.status(400).send("Id Needed");
    }
    BookSchema.findOne({ tag: id }, (err, book) => {
        if (err)
            return next(err);
        if (!book)
            return res.status(404).send("No Book found");
        return res.status(200).send(book);
    });
});

app.get('/api/search/:book', (req, res, next) => {
    let book = req.params.book;
    if (!book) {
        return res.send(300).send("Book Name Required"); 
    }
    book = book.toLowerCase();
    BookSchema.find({ bookName: new RegExp(book, 'i') }, (err, books) => {
        if (err)
            return next(err);
        if (books.length === 0)
            return res.status(404).send("No book Found");
        return res.status(200).send(books);
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