const mongoose = require('mongoose');
const { Schema } =  mongoose;

const CompetitionSchema = new Schema({
    name: String,

    sport: {
        type: Schema.Types.ObjectId,
        ref: 'Sport'
    },

    country: {
        type: Schema.Types.ObjectId,
        ref: 'Country'
    },

    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
    },
})


module.exports = mongoose.model('Competition', CompetitionSchema);