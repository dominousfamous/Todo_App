const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {type: String, required: true},
    password: {type: String, required: true},
    posts: [{
        date: {type: Date, required: true},
        event: {type: String, required: true}
    }]
});

const User = mongoose.model('user', userSchema);

module.exports = User;