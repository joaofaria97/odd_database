const mongoose = require('mongoose');
const { Schema } =  mongoose;

const WebsiteSchema = new Schema({
    name: String,
    homeUrl: String,
    selectors: {
        event: {
            main: String,
            home: String,
            away: String,
            country: String,
            competition: String,
            date: String,
            time: String,
            url: String,
            leagueUrl: String,
        },
        market: {
            main: String,
            market: String,
            period: String,
        }
    },
    sports: [
        {
            sport: {
                type: Schema.Types.ObjectId,
                ref: 'Sport',
            },
            url: String,
            pathName: String,
        },
    ],
    sitemapUrl: String
})

module.exports = WebsiteSchema;