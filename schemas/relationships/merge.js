const mongoose = require('mongoose');
const { Schema } =  mongoose;

const EventSchema = new Schema({
    _id: Schema.Types.ObjectId,
    date: Date,
    url: String,
    home: {
        _id: Schema.Types.ObjectId,
        name: String
    },
    away: {
        _id: Schema.Types.ObjectId,
        name: String
    },
    competition: {
        _id: Schema.Types.ObjectId,
        name: String
    },
    country: {
        _id: Schema.Types.ObjectId,
        name: String
    },
    website: {
        _id: Schema.Types.ObjectId,
        name: String
    },
})

const MergeSchema = new Schema({   
    _id: Date,
    eventsByWebsite: [[ EventSchema ]],
    numWebsites: Number
});

module.exports = mongoose.model('Merge', MergeSchema);
