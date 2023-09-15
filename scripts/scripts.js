require('dotenv').config()

const mongoose = require('mongoose')
const Odds = require('../odds.js');
const Relationships = require('../relationships.js');
const fs = require('fs')

const TeamRel = require('../schemas/relationships/team.js');
const CountryRel = require('../schemas/relationships/country.js');
const CompetitionRel = require('../schemas/relationships/competition.js');
const EventRel = require('../schemas/relationships/event.js');

const logger = require('../../logger/index.js');

(async () => {
  await Odds.create()
  await Relationships.create()

  // await Relationships.instance.clearDB()
  
  await getEventsToMerge()

})()

async function getEventsToMerge() {
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

  let eventsToMerge = await Odds.instance.getModelByName('event').aggregate(pipeline)
  let filteredEventsToMerge = (await Promise.all(eventsToMerge.map(mapEvents)))
  .filter(eventsByDate => eventsByDate.eventsByWebsite.flat().length != 0)

  await Relationships.instance.clearCollection('merge')
  for await (let events of filteredEventsToMerge) {
    await Relationships.instance.saveDocument(events, {}, 'merge')
  }
}

async function mapEvents(eventsByDate) {
  eventsByDate.eventsByWebsite = await Promise.all(eventsByDate.eventsByWebsite.map(async(events) => {
    let results = await Promise.all(events.map(checkForRelationships))
    return events.filter((_v, index) => results[index])
  }))
  return eventsByDate 
}

async function checkForRelationships(event) {
    await checkTeamRelationship(event, event.home._id)
    await checkTeamRelationship(event, event.away._id)

    let results = await Relationships.instance.findDocuments('event', { websites: event._id })
    return results.length == 0
}

async function checkTeamRelationship(event, teamId) {
  let results = await Relationships.instance.findDocuments('team', { websites: teamId })
  if (results.length != 0) {
    let websites = results[0].websites
    let query = {
      $or: [
        { home: websites[0] },
        { home: websites[1] },
        { away: websites[0] },
        { away: websites[1] },
      ],
      date: event.date
    }

    let events = await Odds.instance.findDocuments('event', query)

    if (events.length > 1) {
      logger.info(`Found ${events.length} events with team ${teamId} at ${event.date} to merge`) 
      await mergeRelationships(events.map(event => event._id))
    }
  }
}


async function mergeRelationships(eventIdArray) {
  let eventDocArray = (await Promise.all(
    eventIdArray.map(async(_id) => {
      _id = new mongoose.Types.ObjectId(_id)
      return await Odds.instance.getModelByName('event').find(_id).populate('competition', '_id country')
    })
  )).flat()

  // country
  let countryArray = eventDocArray.map(doc => doc.competition.country)
  await mergeCountries(countryArray)

  // competition
  let competitionArray = eventDocArray.map(doc => doc.competition._id)
  await mergeCompetitions(competitionArray)

  // home
  let homeTeamArray = eventDocArray.map(doc => doc.home)
  await mergeTeams(homeTeamArray)
  
  // away
  let awayTeamArray = eventDocArray.map(doc => doc.away)
  await mergeTeams(awayTeamArray)

  // event
  await mergeEvents(eventIdArray)

}

async function mergeCountries(countryArray) {
  await mergeEntities(countryArray, 'country')
}

async function mergeCompetitions(competitionArray) {
  await mergeEntities(competitionArray, 'competition')
}

async function mergeTeams(teamArray) {
  await mergeEntities(teamArray, 'team')
}

async function mergeEvents(eventArray) {
  await mergeEntities(eventArray, 'event')
}

async function mergeEntities(entityArray, modelName) {
  if (entityArray.length < 2) return

  let docId
  for await (let entity of entityArray) {
    docId = await Relationships.instance.saveDocument(
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
