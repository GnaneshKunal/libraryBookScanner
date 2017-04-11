const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const BookSchema = new mongoose.Schema({
    tag: {
        type: String,
        unique: true
    },
    bookName: String,
    row: {
        rowName: {
            type: String,
            unique: true
        },
        rowId: {
            type: String,
            unique: true
        }
    }
});

module.exports = mongoose.model('Book', BookSchema);