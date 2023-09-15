const mongoose = require('mongoose');
const { Schema } =  mongoose;

const TeamSchema = new Schema({
    name: String, 
    
    competitions: [{
        type: Schema.Types.ObjectId,
        ref: 'Competition'
    }],

    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
    },
})

module.exports = TeamSchema;