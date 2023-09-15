const mongoose = require('mongoose');
const { Schema } =  mongoose;

const CountrySchema = new Schema({
    name: String,
    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
    },
});

module.exports = CountrySchema;