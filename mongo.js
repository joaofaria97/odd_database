const mongoose = require('mongoose');
const logger = require('../logger/index.js');

class Mongo {
  static async connectToMongoDB(databaseName) {
    try {
      let uri = `${process.env.DB_URI}`

      let conn = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: databaseName
      });

      logger.debug(`Connected to ${databaseName} ${process.env.NODE_ENV} database`)
      return conn
    } catch (error) {
      logger.error(`Error connecting to ${databaseName} ${process.env.NODE_ENV} database\n`, error);
    }
  }

  static async initialize() {
    let conn = await this.connectToMongoDB(this.databaseName)
    this.modelMap = this.setupModels(conn)
  }

  static setupModels(conn) {
      let modelMap = {}
      for (let [key, value] of Object.entries(this.schemaMap)) {
          modelMap[key] = conn.model(key.charAt(0).toUpperCase() + key.slice(1), value)
      }
      return modelMap
  }  

  static getModelByName(modelName) {   
    // Retrieve the model based on the input string
    const model = this.modelMap[modelName.toLowerCase()];
    
    if (!model) {
        throw new Error(`Invalid model name: ${modelName}`);
    }
    
    return model;
}

  static async clearDB() {
    try {
      for (let [key, value] of Object.entries(this.modelMap)) {
        if (this.isClearable(key)) await this.clearCollection(key.toLowerCase())
      }
      logger.info(`Deleted all documents from ${this.databaseName} database`);
    } catch (error) {
      logger.error('Error clearing database', error);
    }
  }

  static async clearCollection(collectionName) {
    try {
      await this.getModelByName(collectionName).deleteMany({});
      logger.debug(`Deleted all documents from ${collectionName} collection`);
     } catch (error) {
      logger.error('Error clearing collection', error);
    }
  }

  static async closeConnection() {
    try {
      await mongoose.disconnect();
      this.connected = false;
    } catch (error) {
      console.error('Error closing connection to MongoDB', error);
    }
  }
  
  static async findDocuments(modelName, query) {
    return (await this.getModelByName(modelName).find(query))
  }

  static async findDocumentByName(modelName, name) {
    return (await this.getModelByName(modelName).findOne({ name }))
  }

  static async insertDocument(docModel) {
    try {
      const savedModel = await docModel.save()
      console.log(`${docModel} document created successfully`)
      return savedModel
    } catch (error) {
      console.error(`Error creating ${docModel} document`, docModel)
    }
  }

  static compareIds(id1, id2) {
    return new mongoose.Types.ObjectId(id1).equals(new mongoose.Types.ObjectId(id2))
  }

  static async saveDocument(query, update, modelName) {
    try {
        let model = this.getModelByName(modelName);
        let doc = await model.findOne(query);

        if (doc) {
            let updateObject = {};
            for (let [key, value] of Object.entries(update)) {
                if (model.schema.path(key).instance === 'Array') {
                    updateObject.$addToSet = { [key]: value };
                } else {
                    updateObject[key] = value;
                }
            }

            if (Object.keys(updateObject).length > 0) {
                let res = await model.updateOne(query, updateObject);  
              if (res.modifiedCount > 0) {
                    logger.info(`[${modelName}] ${doc._id} updated - update: ${JSON.stringify(updateObject)}`);
              } else {
                  logger.debug(`[${modelName}] No updates found for ${doc._id}`);
              }
            }
        } else {
            let newObject = { ...query, ...update };
            doc = new model(newObject);
            await doc.save();
            logger.info(`[${modelName}] ${doc._id} inserted`);
        }
        return doc._id;
    } catch (error) {
        logger.error(`[${modelName}] Error saving document\n`, error);
    }
}

  static async runAggregation(pipeline, modelName) {
    return await this.getModelByName(modelName).aggregate(pipeline);
  }

}

module.exports = Mongo;
