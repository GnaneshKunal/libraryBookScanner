const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: false
    },
    regno: {
        type: String,
        unique: true
    },
    id: {
        type: String,
        unique: false
    },
    pendingFine: {
        type: Number,
        unique: false
    }
});

module.exports = mongoose.model('User', UserSchema);
