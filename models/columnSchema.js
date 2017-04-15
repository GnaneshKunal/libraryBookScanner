const mongoose = require('mongoose');
const BookSchema = require('./bookSchema');

mongoose.promise = global.promise;

const ColumnSchema = new mongoose.Schema({
    tag: {
        type: String,
        unique: true
    },
    columnName: {
        type: String,
        unique: true
    },
    books: [{ type: mongoose.Schema.ObjectId, ref: 'Book' }]
});

module.exports = mongoose.model('Column', ColumnSchema);