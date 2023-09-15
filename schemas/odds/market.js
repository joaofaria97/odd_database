const mongoose = require('mongoose');
const { Schema } =  mongoose;

const MarketSchema = new Schema({
    market: String,
    period: String,

    options: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Option'
        }
    ],

    sport: {
        type: Schema.Types.ObjectId,
        ref: 'Sport'
    },

    websites: [
        {
            website: {
                type: Schema.Types.ObjectId,
                ref: 'Website'
            },
            market: String,
            period: String,
            options: [
                {
                    option: {
                        type: Schema.Types.ObjectId,
                        ref: 'Option'
                    },
                    selector: String
                }
            ]
        }
    ]
})

MarketSchema.methods.getMarket = function() {
    return this.market
}

module.exports = MarketSchema;