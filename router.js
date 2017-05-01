const app = require('express').Router(),
    url = require('url'),
    mongoose = require('mongoose'),
    Mailjet = require('node-mailjet')
                            .connect(process.env.MAILJET_API, process.env.MAILJET_SECRET),
    BookSchema = require('./models/bookSchema'),
    ColumnSchema = require('./models/columnSchema');

module.exports = app;

function sendMail(book, misplacedColumn) {
    var options = {
        FromEmail: process.env.SENDER_EMAIL,
        FromName: "Library Book Scanner",
        Recipients: [ { Email: process.env.LIBRARIAN }],
        Subject: "Book Misplaced",
        "Text-part": `The Book (${book.bookName} - ${book.tag}) which must be in ${book.row.rowName} is misplaced in ${misplacedColumn.columnName}.`,
        "Html-part": `<h3>The Book (${book.bookName} - ${book.tag}) which must be in ${book.row.rowName} is misplaced in ${misplacedColumn.columnName}.</h3>`
    };
    var request = Mailjet.post('send').request(options);
        request.then((data) => {
            console.log(data);
        })
        .catch((err) => {
            console.log(err);
        });
    return true;
}

app.get('/', (req, res, next) => {
    return res.status(200).send("Library Book Scanner IoT Project");
});

app.get('/api/', (req, res, next) => {
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

app.get('/api/misplaced', (req, res, next) => {
    let bookID = req.query.book;
    let rowID = req.query.row;
    if (!bookID || !rowID)
        return res.status(400).send("You need to specify bookID and columnID");
    ColumnSchema.findOne({ tag: rowID })
            .populate('books', '-__v -_id -row')
            .exec((err, row) => {
        if (err)
            return next(err);
        if (!row)
            return res.status(400).send("Please, Enter a valid row");
        var arr = row.books.map((book) => {
                    return book.tag;
                });
        if (arr.indexOf(bookID) !== -1)
            return res.status(400).send("The book is in the right place");
        BookSchema.findOne({ tag: bookID }, (err, book) => {
            if (err)
                return next(err);
            if (!book)
                return res.status(404).send("Please enter a correct BookID");
            if (book) {
                sendMail(book, row);
                return res.status(200).send("A mail has been sent to librarian");
            }
        });
    });
});

app.get('/api/search', (req, res, next) => {
    let book = req.query.book;
    if (!book) {
        return res.send(400).send("Book Name Required"); 
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

app.get('/api/books/:id', (req, res, next) => {
    let tag = req.params.id;
    if (!tag || tag.length < 1)
        return res.status(500).send("Please enter a Valid Tag");
    ColumnSchema.findOne({ tag }).populate('books', '-__v -_id -row')
        .exec((err, books) => {
            if (err)
                return next(err);
            if (!books)
                return res.status(200).send("No books are available in this column");
                var arr = books.books.map((book) => {
                    return book.tag;
                });
            return res.status(200).send(arr);
        });
});

app.get('/api/column/:id', (req, res, mext) => {
    let tag = req.params.id;
    if (!tag || tag.length < 1)
        return res.status(500).send("Please enter a Valid Tag");
    ColumnSchema.findOne({ tag }, (err, column) => {
        if (err)
            return next(err);
        if (!column)
            return res.send(500).send("No column found");
        return res.status(200).send(column.columnName);
    });
});

app.post('/api/new', (req, res, next) => {
    let tag = req.body.tag;
    let bookName = req.body.bookName;
    let rowName = req.body.rowName;
    let rowId = req.body.rowId;
    ColumnSchema.findOne({ tag: rowId }, (err, row) => {
        if (err)
            return next(err);
        if (!row)
            return res.status(400).send("Please, Enter a valid row.");
        if (row) {
            BookSchema.findOne({ tag }, (err, book) => {
                if (err)
                    return next(err);
                if (book)
                    return res.status(400).send("The book is already available");
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
                    row.books.push(book._id);
                    row.save((err, row) => {
                        if (err) next(err);

                        return res.status(200).send(book);
                    });
                });
            });
        }
    });
});

app.post('/api/row', (req, res, next) => {
    let tag = req.body.tag;
    let columnName = req.body.columnName;
    ColumnSchema.find({ tag }, (err, row) => {
        if (err)
            return next(err);
        if (row.length != 0)
            return res.status(400).send("That column already exists");
        else {
            var column = new ColumnSchema({
                tag,
                columnName
            });
            column.save((err, row) => {
                if (err)
                    return next(err);
                return res.status(200).send(row);
            });
        }
    });
});
