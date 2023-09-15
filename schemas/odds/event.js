const mongoose = require('mongoose');
const { Schema } =  mongoose;

const EventSchema = new Schema({
    home: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },

    away: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
    },

    competition: {
        type: Schema.Types.ObjectId,
        ref: 'Competition',
    },

    date: Date,

    
    url: String,
    
    sport: {
        type: Schema.Types.ObjectId,
        ref: 'Sport'
    },
    
    entryDate: Date,

    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
    },
})

module.exports = EventSchema;