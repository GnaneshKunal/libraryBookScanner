const app = require('express').Router(),
    url = require('url'),
    mongoose = require('mongoose'),
    Mailjet = require('node-mailjet')
                            .connect(process.env.MAILJET_API, process.env.MAILJET_SECRET),
    BookSchema = require('./models/bookSchema'),
      ColumnSchema = require('./models/columnSchema'),
      UserSchema = require('./models/userSchema'),
      _ = require('lodash');

module.exports = app;


let users = {};

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

function checkID(arr, id) {
    let i = 0;
    _.forEach(arr, (u) => {
        if (_.indexOf(u.searchBooks, id) !== -1) {
            return { user: u.id, id: id };
        }
        if (i === _.size(users)) {
            return false;
        }
        i++;
    });
}

app.get('/v2/connect', (req, res, next) => {
    let name = req.query.name;
    let id = req.query.id;
    if (!name || !id)
        return res.status(400).send("Please send Name and Id");
    users[id] = {
        name,
        id,
        searchBooks: [],
        foundBooks: []
    };
    UserSchema.findOne({ id }, (err, user) => {
        if (err) {
            delete users[id];
            return next(err);
        }
        if (!user) {
            delete users[id];
            return res.status(404).send("No user found");
        }
        return res.status(200).send({
            user: user.name,
            regno: user.regno,
            pendingFine: user.pendingFine
        });
    });
});

app.get('/v2/disconnect', (req, res, next) => {
    let id = req.query.id;
    if (!id)
        return res.status(400).send("Please send ID");
    if (!delete users[id]) {
        return res.status(400).send("Something went wrong");
    }
    return res.status(200).send("Disconnected");
});

app.get('/v2/getuser', (req, res, next) => {
    let id = req.query.id;
    if (!id) {
        return res.status(400).send("Please enter ID");
    }
    UserSchema.findOne({ id }, (err, user) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(404).send("No user found");
        return res.status(200).send(user);
    });
});

app.get('/v2/getsession', (req, res, next) => {
    return res.status(200).send(users);
});

app.post('/v2/putbooks', (req, res, next) => {
    let bulkBooks = req.body.bulkbooks;
    let id = req.body.id;
    if (!bulkBooks || !id)
        return res.status(400).send("Please send bulk books and user id");

    if (users[id] === undefined)
        return res.status(400).send("Please authenticate");

    let parsedBulkBooks;

    try {
        parsedBulkBooks = JSON.parse(bulkBooks);
    } catch (err) {
        return res.status(400).send("Send the correct format");
    }
    users[id].searchBooks = users[id].searchBooks.concat(bulkBooks);

    return res.status(200).send("Updated Books");
});

app.post('/v2/putbooks2', async (req, res, next) => {
    let bulkbooks = req.body.bulkbooks;
    let id = req.body.id;
    if (!bulkbooks || !id)
        return res.status(400).send("Please send bulk books and user id");

    if (users[id] === undefined)
        return res.status(400).send("Please authenticate");

    let parsedBulkBooks = bulkbooks.split(',');
    /*
    try {
        parsedBulkBooks = JSON.parse(bulkbooks);
    } catch(err) {
        return res.status(400).send("Send the correct format");
    }
    */
    var books = [];
    await _.forEach(parsedBulkBooks, (b) => {
        BookSchema.find({ bookName: new RegExp(b, 'i') }, (err, book) => {
            if (err)
                return next(err);
            //if (books.length === 0) {
                //return res.status(404).send("No book Found");
            //}
            if (book.length !== 0) {
                //eb++;
                books.push(book[0].tag);
            }
            //if (books.length === parsedBulkBooks.length) {
                // users[id].searchBooks = users[id].searchBooks.concat(parsedBulkBooks);
            users[id].searchBooks = _.uniq(users[id].searchBooks.concat(books));
                //return res.status(200).send("Added");
            //}
        });
    });
    return res.status(200).send("ADDED");
});

app.get('/v2/getbooks', (req, res, next) => {
    let id = req.query.id;
    if (!id)
        return res.status(400).send("Please enter your ID");

    if (users[id] === undefined)
        return res.status(400).send("Please authenticate");

    return res.status(200).send(users[id].searchBooks);
});

app.get('/v2/search/book', (req, res, next) => {
    let bid = req.query.bid;
    let id = req.query.id;
    let rid = req.query.rid;

    if (!bid || !id) {
        return res.status(400).send("Book ID and userID required");
    }

    if (users[id] === undefined)
        return res.status(400).send("Please authenticate");

    BookSchema.findOne({ tag: bid }, (err, book) => {
        if (err)
            return next(err);
        if (!book) {
            return res.status(404).send("No book found");
        } else {
            if (_.indexOf(users[id].searchBooks, bid) !== -1) {
                return res.status(200).send("Book Found");
            } else {
                let found = checkID(users, bid);
                if (found) {
                    //users[id].foundBooks = users[id].foundBooks
                    //users[id].foundBooks = users[id].foundBooks.concat(books);
                    //users[id].foundBooks.push({ uid: id, bid, rid}); something wron with this
                    users[found.user].foundBooks.push({ uid: id, bid, rid });
                    //users[found.user].foundBooks
                    _.remove(users[found.user].searchBooks, (b) => {
                        return b === bid;
                    });
                    // return res.status(200).send("Book Found");
                    return res.status(200).send("helped him");
                } else {
                    return res.status(200).send("Not your book");
                }
            }
        }
    });
});

// do found book
app.get('/v2/realtime', (req, res, next) => {
    let id = req.query.id;

    if (users[id] === undefined)
        return res.status(400).send("Please authenticate");

    if (!id)
        return res.status(400).send("Please send your ID");
    if (_.isEqual(users[id].foundBooks, [])) {
        return res.status(200).send("Still not found");
    } else {
        let foundBook = users[id].foundBook.pop();
        //return res.status(200).send(foundBook);
        ColumnSchema.findOne({ tag: foundBook.rid }, (err, row) => {
            if (err)
                return next(err);
            if (!row)
                return res.status(404).send("Column Not found");
            else {
                // check here as well.
                _.remove(users[id].foundBooks, (b) => {
                    return b.bid === foundBook.bid;
                });
                return res.status(200).send(_.merge(foundBook, {
                    columnName: row.columnName
                }));
            }
        });
    }
});


app.get('/te', (req, res, next) => {
    let id = req.query.id;
    if (!id) {
        return res.status(400).send("Please send your ID");
    }

    if (users[id] === undefined)
        return res.status(400).send("Please authenticate");

    if (users[id] == undefined)
        return res.status(404).send("ID not found");
    let pendingBooks = users[id].pendingBooks;
    if (pendingBooks.length > 0)
        return res.status(200).send({ok: "ok"});
    return res.status(200).send(users[id].pendingBooks);
});


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
        return res.status(400).send("Book Name Required"); 
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

app.get('/api/row/:id', (req, res, mext) => {
    let tag = req.params.id;
    if (!tag || tag.length < 1)
        return res.status(500).send("Please enter a Valid Tag");
    ColumnSchema.findOne({ tag }, (err, column) => {
        if (err)
            return next(err);
        if (!column)
            return res.status(500).send("No column found");
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
