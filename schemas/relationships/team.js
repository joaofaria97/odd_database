const mongoose = require('mongoose');
const { Schema } =  mongoose;

const TeamSchema = new Schema({   
    websites: [{
        type: Schema.Types.ObjectId,
        ref: 'Team'
    }],
});

module.exports = TeamSchema;