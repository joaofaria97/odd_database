const Odds = require('./odds.js')
const Relationships = require('./relationships.js')
const natural = require('natural')

class Util {
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
                        await Relationships.saveDocument(bestMatch, {}, 'merge')
                    } else {
                        await Relationships.mergeRelationships(bestMatch.events.map(event => event._id))
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
}

module.exports = Util;