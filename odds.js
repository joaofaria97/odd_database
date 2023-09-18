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
    static databaseName = 'odds'
    static schemaMap = {
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
        await Odds.initialize();
    }
 
    static async saveEvent(eventObject, sportId) { 
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

    static async saveOdd(oddObject) {
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

    static async findFutureEvents() {
        let currentDate = new Date()
        let query = { date: { $gt: currentDate }}
        return await this.getModelByName('event').find(query)
    }

    static async findFutureEventsByWebsite(websiteId) {
        let currentDate = new Date()
        let query = { 
            date: { $gt: currentDate },
            website: websiteId
        }
        return await this.getModelByName('event').find(query)
        .sort({date: 1})
        .limit(200)
    }

    static async getMarketsBySportId(sportId) {
        let query = { sport: sportId }
        return await Market.find(query)
    }

    static async getHomeEvents () {
        let defaultMarket = await this.getModelByName('market').findOne ({ default: true })
        let pipeline =[
            // {
            //   '$match': {
            //     'date': {
            //       '$gt': new Date()
            //     }
            //   }
            // }, 
            {
              '$lookup': {
                'from': 'odds', 
                'localField': '_id', 
                'foreignField': 'event', 
                'pipeline': [
                  {
                    '$match': {
                      'market': defaultMarket._id
                    }
                  }, {
                    '$group': {
                      '_id': {
                        'event': '$event', 
                        'market': '$market'
                      }, 
                      'options': {
                        '$push': {
                          'option': '$option', 
                          'oddValues': '$oddValues', 
                          'website': '$website'
                        }
                      }
                    }
                  }
                ], 
                'as': 'odds'
              }
            }, {
              '$match': {
                'odds': {
                  '$exists': true, 
                  '$ne': []
                }
              }
            }, {
              '$set': {
                'odds': {
                  '$first': '$odds'
                }
              }
            }, {
              '$lookup': {
                'from': 'teams', 
                'localField': 'home', 
                'foreignField': '_id', 
                'as': 'home'
              }
            }, {
              '$lookup': {
                'from': 'teams', 
                'localField': 'away', 
                'foreignField': '_id', 
                'as': 'away'
              }
            }, {
              '$lookup': {
                'from': 'competitions', 
                'localField': 'competition', 
                'foreignField': '_id', 
                'as': 'competition'
              }
            }, {
              '$lookup': {
                'from': 'websites', 
                'localField': 'website', 
                'foreignField': '_id', 
                'as': 'website'
              }
            }, {
              '$project': {
                'home.name': 1, 
                'home._id': 1, 
                'away.name': 1, 
                'away._id': 1, 
                'competition.name': 1, 
                'competition._id': 1, 
                'competition.country': 1, 
                'country.name': 1, 
                'country._id': 1, 
                'website.name': 1, 
                'website._id': 1, 
                'date': 1, 
                'url': 1, 
                'odds': 1
              }
            }, {
              '$project': {
                'home': {
                  '$first': '$home'
                }, 
                'away': {
                  '$first': '$away'
                }, 
                'competition': {
                  '$first': '$competition'
                }, 
                'country': {
                  '$first': '$competition.country'
                }, 
                'date': 1, 
                'url': 1, 
                'website': {
                  '$first': '$website'
                }, 
                'odds': 1
              }
            }, {
              '$lookup': {
                'from': 'countries', 
                'localField': 'country', 
                'foreignField': '_id', 
                'as': 'country'
              }
            }, {
              '$project': {
                'home': 1, 
                'away': 1, 
                'competition': 1, 
                'country': {
                  '$first': '$country'
                }, 
                'date': 1, 
                'url': 1, 
                'website': 1, 
                'odds': 1
              }
            }, {
              '$project': {
                'country.website': 0, 
                'competition.country': 0
              }
            }
          ]
    
        let events = await Odds.getModelByName('event').aggregate(pipeline)
        console.log(events)
    }
    

    
}

module.exports = Odds;
