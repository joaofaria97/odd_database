const mongoose = require('mongoose');
const { Schema } =  mongoose;

const EventSchema = new Schema(
    {
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
    },
)

EventSchema.methods.getHomeEvents = function() {
    /*
    get future events by date
    
    */

    // let pipeline = 
    // let events = 
}

module.exports = EventSchema;


async function getHomeEvents() {
    /* 
    {
        _id: { relationship_id: ObjectId, event_id: ObjectId}
        home: { _id: ObjectId, name: String },
        away: { _id: ObjectId, name: String },
        competition: { _id: ObjectId, name: String },
        country: { _id: ObjectId, name: String },
        date: Date,
        markets: [
            {
                market: { _id: ObjectId, name: String },
                option: { 
                    _id: ObjectId,
                    odds: [
                        {
                            website: { _id: ObjectId, name: String },
                            oddValue: Number,
                            lastVisited: Date
                        }
                    ]
                }
            }
        ]
    }
    */
    
    /* 
    procurar eventos por data
    para cada evento
        verificar se existe relação
        se existir relação,
            compilar informação de ambos

    */
}