const mongoose = require('mongoose');
const { Schema } =  mongoose;

const SportSchema = new Schema({
    name: String,
})

module.exports = SportSchema;