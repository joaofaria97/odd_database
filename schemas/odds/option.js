const mongoose = require('mongoose');
const { Schema } =  mongoose;

const OptionSchema = new Schema({
    name: String,
})

module.exports = OptionSchema;

