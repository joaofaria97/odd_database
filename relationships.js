const mongoose = require('mongoose')
const Mongo = require('./mongo.js');
const Odds = require('./odds.js')


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
