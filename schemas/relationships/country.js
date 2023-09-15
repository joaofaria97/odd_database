const mongoose = require('mongoose');
const { Schema } =  mongoose;

const CountrySchema = new Schema({   
    websites: [{
        type: Schema.Types.ObjectId,
        ref: 'Country'
    }],
});

module.exports = CountrySchema