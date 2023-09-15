const Mongo = require('./mongo.js');

const Website = require('./schemas/odds/website.js')
const Sport = require('./schemas/odds/sport.js');
const Team = require('./schemas/odds/team.js');
const Country = require('./schemas/odds/country.js');
const Competition = require('./schemas/odds/competition.js');
const Event = require('./schemas/odds/event.js');
const Market = require('./schemas/odds/market.js');
const Odd = require('./schemas/odds/odd.js');
const Option = require('./schemas/odds/option.js')

class Odds extends Mongo {
    static instance
    databaseName = 'odds'
    schemaMap = {
        website: Website,
        sport: Sport,
        country: Country,
        competition: Competition,
        team: Team,
        event: Event,
        market: Market,
        odd: Odd,
        option: Option
    };

    static async create() {
        const obj = new Odds();
        await obj.initialize();
        this.instance = obj;
        return obj;
    }
 
    async saveEvent(eventObject, sportId) { 
        let countryId = await this.saveDocument(
            { 
                name: eventObject.competition.country,
                website: eventObject.website
            },
            {},
            'country'
        )
        let competitionId = await this.saveDocument(
            {
                name: eventObject.competition.league,
                sport: sportId,
                country: countryId,
                website: eventObject.website
            },
            {},
            'competition'
        )
        let homeId = await this.saveDocument(
            {
                name: eventObject.home,
                website: eventObject.website
            },
            {
               competitions: competitionId,
            },
            'team'
        )
        let awayId = await this.saveDocument(
            {
                name: eventObject.away,
                website: eventObject.website
            },
            {
                competitions: competitionId,
            },
            'team'
        )

        await this.saveDocument(
            {
                website: eventObject.website,
                home: homeId,
                away: awayId,
                competition: competitionId,
                sport: sportId,
                entryDate: new Date()
            },
            {
                date: eventObject.date,
                url: eventObject.url,
            },
            'event'
        )
    }

    async findFutureEvents() {
        let currentDate = new Date()
        let query = { date: { $gt: currentDate }}
        return await this.getModelByName('event').find(query)
    }

    async findFutureEventsByWebsite(websiteId) {
        let currentDate = new Date()
        let query = { 
            date: { $gt: currentDate },
            website: websiteId
        }
        return await this.getModelByName('event').find(query)
        .sort({date: 1})
        .limit(200)
    }

    async getMarketsBySportId(sportId) {
        let query = { sport: sportId }
        return await Market.find(query)
    }

    async saveOdd(oddObject) {
        await this.saveDocument(
            {
                market: oddObject.market,
                event: oddObject.event,
                website: oddObject.website,
                option: oddObject.option,
            },
            {
                oddValues: {
                    oddValue: oddObject.oddValue,
                    date: new Date()
                }
            },
            'odd'
        )
    }
}

module.exports = Odds;
