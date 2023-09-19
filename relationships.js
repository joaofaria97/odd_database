const Mongo = require('./mongo.js');

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
}

module.exports = Relationships;
