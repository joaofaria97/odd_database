const mongoose = require('mongoose');
const { Schema } =  mongoose;

const CompetitionSchema = new Schema({   
    websites: [{
        type: Schema.Types.ObjectId,
        ref: 'Competition'
    }],
});

module.exports = CompetitionSchema;