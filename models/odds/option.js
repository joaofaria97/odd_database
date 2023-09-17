const mongoose = require('mongoose');
const { Schema } =  mongoose;

const OptionSchema = new Schema({
    name: String,
})

module.exports = mongoose.model('Option', OptionSchema);
