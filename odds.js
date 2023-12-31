const Mongo = require('./mongo.js');

const Website = require('./schemas/odds/website.js')
const Sport = require('./schemas/odds/sport.js');
const Team = require('./schemas/odds/team.js');
const Country = require('./schemas/odds/country.js');
const Competition = require('./schemas/odds/competition.js');
const Event = require('./schemas/odds/event.js');
const Market = require('./schemas/odds/market.js');
const Odd = require('./schemas/odds/odd.js');
const Option = require('./schemas/odds/option.js');
const Relationships = require('./relationships.js');

const util = require('util')


// const Event = require('./utils/event.js');

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

    static isClearable(key) {
      return ['country', 'competition', 'team','event','odd'].includes(key)
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
            },
            {
                date: eventObject.date,
                url: eventObject.url,
                // entryDate: new Date()
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

    static async getHomeEvents(competition) {
        
        let marketId = (await this.getModelByName('market').findOne({ default: true }))._id
        let pipeline = [
          {
            '$match': {
              'date': {
                '$gt': new Date()
              }
            }
          },
          {
            '$sort': {
                'date': 1
            }
          }, 
          {
            '$lookup': {
              'from': 'odds', 
              'localField': '_id', 
              'foreignField': 'event', 
              'pipeline': [
                {
                  '$match': {
                    'market': marketId
                  }
                }, {
                  '$group': {
                    '_id': {
                      'event': '$event', 
                      'market': '$market'
                    }, 
                    'options': {
                      '$push': {
                        '_id': '$option', 
                        'odd': {
                          '$last': '$oddValues'
                        }, 
                        'website': '$website'
                      }
                    }
                  }
                }
              ], 
              'as': 'market'
            }
          }, {
            '$match': {
              'market': {
                '$exists': true, 
                '$ne': []
              }
            }
          },
           {
            '$limit': 20
          },
          {
            '$set': {
              'market._id': {
                '$first': '$market._id.market'
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
          },{
            '$lookup': {
              'from': 'sports', 
              'localField': 'sport', 
              'foreignField': '_id', 
              'as': 'sport'
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
              'website.namingPriority': 1,
              'sport': 1, 
              'date': 1, 
              'url': 1, 
              'market': 1
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
              'sport': {
                '$first': '$sport'
              }, 
              'market': {
                '$first': '$market'
              }
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
              'market': 1,
              'sport': 1
            }
          }, {
            '$project': {
              'country.website': 0, 
              'competition.country': 0
            }
          }, {
            '$set': {
              '_id': {
                'relationshipId': null, 
                '_id': '$_id'
              }, 
              'home._id': {
                'relationshipId': null, 
                '_id': '$home._id'
              }, 
              'away._id': {
                'relationshipId': null, 
                '_id': '$away._id'
              }, 
              'competition._id': {
                'relationshipId': null, 
                '_id': '$competition._id'
              }, 
              'country._id': {
                'relationshipId': null, 
                '_id': '$country._id'
              }, 
              'market.options.website': {
                '_id': '$website._id', 
                'name': '$website.name'
              }
            }
          }
        ]
    
        if (competition) {
          let compRel = await Relationships.getModelByName('competition').findOne({ 'websites': competition })
          
          let competitions = compRel ? compRel.websites : [competition]

          let compFilter =  {
              '$match': {
                'competition': {
                  '$in': competitions
                }
              }
            }

          pipeline.splice(0, 0, compFilter)
        }

        // console.log(pipeline[0])
        console.log(util.inspect(pipeline[0], false, null, true /* enable colors */))

        let events = await Odds.getModelByName('event').aggregate(pipeline)
        return events
    }
    
    static async getTopCompetitions() {
      let pipeline = [
        {
          '$match': {
            'date': {
              '$gt': new Date()
            }
          }
        },
        {
          '$group': {
            '_id': '$competition', 
            'totalEvents': {
              '$sum': 1
            }
          }
        }, {
          '$sort': {
            'totalEvents': -1
          }
        },
        //  {
        //   '$limit': 5
        // },
         {
          '$lookup': {
            'from': 'competitions', 
            'localField': '_id', 
            'foreignField': '_id', 
            'as': 'competition'
          }
        }, {
          '$unwind': {
            'path': '$competition'
          }
        }, {
          '$lookup': {
            'from': 'countries', 
            'localField': 'competition.country', 
            'foreignField': '_id', 
            'as': 'country'
          }
        }, {
          '$unwind': {
            'path': '$country'
          }
        }, {
          '$lookup': {
            'from': 'sports', 
            'localField': 'competition.sport', 
            'foreignField': '_id', 
            'as': 'sport'
          }
        }, {
          '$unwind': {
            'path': '$sport'
          }
        }
      ]

      let topCompetitions = await this.getModelByName('event').aggregate(pipeline)
      return topCompetitions
    }

    
}

module.exports = Odds;