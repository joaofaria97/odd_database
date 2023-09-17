const mongoose = require('mongoose');
const { Schema } =  mongoose;

const OddSchema = new Schema({
    oddValues: [{
        oddValue: Number,
        date: Date
    }],
    option: {
        type: Schema.Types.ObjectId,
        ref: 'Option'
    },
    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website'
    },
    market: {
        type: Schema.Types.ObjectId,
        ref: 'Market'
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event'
    },
})

module.exports = OddSchema;