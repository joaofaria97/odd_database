const mongoose = require('mongoose')
const Mongo = require('./mongo.js');
const Odds = require('./odds.js')

const natural = require('natural')

const Team = require('./schemas/relationships/team.js');
const Country = require('./schemas/relationships/country.js');
const Competition = require('./schemas/relationships/competition.js');
const Event = require('./schemas/relationships/event.js');
const Merge = require('./schemas/relationships/merge.js');

class Relationships extends Mongo {
    static databaseName = 'relationships'
    static schemaMap = {
        country: Country,
        competition: Competition,
        team: Team,
        event: Event,
        merge: Merge
    };

    static async create() {
        await Relationships.initialize()
    }

    static isClearable(key) {
        return true
    }

    static async mergeEventsBySport() {
        let pipeline = [
          {
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
                  'url': 1
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
                  'website': 1
              }
          }, {
              '$project': {
                  'country.website': 0, 
                  'competition.country': 0
              }
          }, {
              '$group': {
                  '_id': {
                      'website': '$website', 
                      'date': '$date'
                  }, 
                  'eventsByWebsite': {
                      '$push': '$$ROOT'
                  }
              }
          }, {
              '$group': {
                  '_id': '$_id.date', 
                  'eventsByWebsite': {
                      '$push': '$eventsByWebsite'
                  }
              }
          }, {
              '$project': {
                  'numWebsites': {
                      '$size': '$eventsByWebsite'
                  }, 
                  'eventsByWebsite': 1
              }
          }, {
              '$match': {
                  'numWebsites': {
                      '$gt': 1
                  }
              }
          }
      ]
        let eventsBySport = await Odds.getModelByName('event').aggregate(pipeline)
        for await (let eventsByDate of eventsBySport) {
            let eventsByWebsite = eventsByDate.eventsByWebsite

            for (let i = 0; i < eventsByWebsite.length; i++) {
                for await (let event of eventsByWebsite[i]) {
                  let pairings = []
                  for (let j = i + 1; j < eventsByWebsite.length; j++) {
                    for await(let otherEvent of eventsByWebsite[j]) {
                      pairings.push({
                        events: [event, otherEvent],
                        similarity: this.calcTotalSimilarity(event, otherEvent),
                      })
                    }
                    let bestMatch = pairings.reduce((maxPairing, currentPairing) => {
                      return currentPairing.similarity > maxPairing.similarity ? currentPairing : maxPairing
                    }, pairings[0])

                    if (bestMatch.similarity <= 0.90) {
                        bestMatch.checked = false
                        bestMatch.merge = false
                        await this.saveDocument(bestMatch, {}, 'merge')
                    } else {
                        await this.mergeRelationships(bestMatch.events.map(event => event._id))
                    }
                  }
                }
            }
        }
    }    

    static calcTotalSimilarity(event1, event2) {
        let total = 0
        let fieldNames = ['country', 'competition', 'home', 'away']
        fieldNames.forEach(fieldName => {
            total += this.calcSimilarity(event1[fieldName].name, event2[fieldName].name)
        })

        return total / fieldNames.length
    }

    static calcSimilarity(str1, str2) {
        return 1 - natural.LevenshteinDistance(str1, str2) / Math.max(str1.length, str2.length)
    }
    
    static async mergeRelationships(eventIdArray) {
        let eventDocArray = (await Promise.all(
            eventIdArray.map(async(_id) => {
            _id = new mongoose.Types.ObjectId(_id)
            return await Odds.getModelByName('event').find(_id).populate('competition', '_id country')
            })
        )).flat()
    
        // country
        let countryArray = eventDocArray.map(doc => doc.competition.country)
        await this.mergeCountries(countryArray)
        
        // competition
        let competitionArray = eventDocArray.map(doc => doc.competition._id)
        await this.mergeCompetitions(competitionArray)
        
        // home
        let homeTeamArray = eventDocArray.map(doc => doc.home)
        await this.mergeTeams(homeTeamArray)
        
        // away
        let awayTeamArray = eventDocArray.map(doc => doc.away)
        await this.mergeTeams(awayTeamArray)
        
        // event
        await this.mergeEvents(eventIdArray)
    
    }
    
    static async mergeCountries(countryArray) {
        await this.mergeEntities(countryArray, 'country')
    }
    
    static async mergeCompetitions(competitionArray) {
        await this.mergeEntities(competitionArray, 'competition')
    }
    
    static async mergeTeams(teamArray) {
        await this.mergeEntities(teamArray, 'team')
    }
    
    static async mergeEvents(eventArray) {
    await this.mergeEntities(eventArray, 'event')
    }
    
    static async mergeEntities(entityArray, modelName) {
        if (entityArray.length < 2) return
        
        let docId
        for await (let entity of entityArray) {
            docId = await this.saveDocument(
            {
                $or: [ { _id: docId }, { websites: entity } ]
            },
            {
                websites: entity
            },
            modelName
            )
        }
    }
}

module.exports = Relationships;
