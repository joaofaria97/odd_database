const mongoose = require('mongoose');
const { Schema } =  mongoose;

const EventSchema = new Schema({   
    websites: [{
        type: Schema.Types.ObjectId,
        ref: 'Event'
    }],
});

module.exports = mongoose.model('Event', EventSchema);
