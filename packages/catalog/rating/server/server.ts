import * as bodyParser from 'body-parser';
import * as express from 'express';
import { readFileSync } from 'fs';
import * as minimist from 'minimist';
import * as mongodb from 'mongodb';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

import { graphiqlExpress, graphqlExpress  } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';


interface SourceDoc {
  id: string;
}

interface TargetDoc {
  id: string;
}

interface RatingDoc {
  sourceId: string;
  targetId: string;
  rating: number;
}


interface Config {
  wsPort: number;
  dbHost: string;
  dbPort: number;
  dbName: string;
  reinitDbOnStartup: boolean;
}

const argv = minimist(process.argv);

const name = argv.as ? argv.as : 'rating';

const DEFAULT_CONFIG: Config = {
  dbHost: 'localhost',
  dbPort: 27017,
  wsPort: 3000,
  dbName: `${name}-db`,
  reinitDbOnStartup: true
};

let configArg;
try {
  configArg = JSON.parse(argv.config);
} catch (e) {
  throw new Error(`Couldn't parse config ${argv.config}`);
}

const config: Config = {...DEFAULT_CONFIG, ...configArg};

console.log(`Connecting to mongo server ${config.dbHost}:${config.dbPort}`);
let db, sources, ratings, targets;
mongodb.MongoClient.connect(
  `mongodb://${config.dbHost}:${config.dbPort}`, async (err, client) => {
    if (err) {
      throw err;
    }
    db = client.db(config.dbName);
    if (config.reinitDbOnStartup) {
      await db.dropDatabase();
      console.log(`Reinitialized db ${config.dbName}`);
    }
    sources = db.collection('sources');
    sources.createIndex({ id: 1 }, { unique: true, sparse: true });
    targets = db.collection('targets');
    targets.createIndex({ id: 1 }, { unique: true, sparse: true });
    ratings = db.collection('ratings');
    ratings.createIndex(
      { sourceId: 1, targetId: 1 }, { unique: true, sparse: true });
  });


const typeDefs = [readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8')];

class Validation {
  static async sourceExists(sourceId: string) {
    return Validation.exists(sources, sourceId, 'Source');
  }

  static async targetExists(targetId: string) {
    return Validation.exists(targets, targetId, 'Target');
  }

  private static async exists(collection, id: string, type: string) {
    const doc = await collection.findOne({ id: id });
    if (!doc) {
      throw new Error(`${type} ${id} not found`);
    }

    return doc;
  }
}

const resolvers = {
  Query: {
    source: (root, { id }) => sources.findOne({ id: id }),
    target: (root, { id }) => targets.findOne({ id: id }),
    ratingBySourceTarget: (root, {sourceId, targetId}) => ratings
      .findOne({ sourceId: sourceId, targetId: targetId }),
    averageRatingForTarget: async (root, {targetId}) => {
      const ratingsForTarget = await ratings
        .find({ targetId: targetId })
        .toArray();
      const count = ratingsForTarget.length;
      const average = ratingsForTarget.reduce(
        // Sum over all the values, adjusting each for the number of results
        (prev, current) => prev + (current.rating / count), 0);

      return { rating: average, count: count };
    }
  },
  Source: {
    id: (source: SourceDoc) => source.id,
    ratings: (source: SourceDoc) => ratings
      .find({ sourceId: source.id })
      .toArray()
  },
  Target: {
    id: (target: TargetDoc) => target.id,
    ratings: (target: TargetDoc) => ratings
      .find({ targetId: target.id })
      .toArray()
  },
  Rating: {
    sourceId: (rating: RatingDoc) => rating.sourceId,
    targetId: (rating: RatingDoc) => rating.targetId,
    rating: (rating: RatingDoc) => rating.rating
  },
  Mutation: {
    updateRating: async (root, {sourceId, targetId, newRating}) => {
      await Promise.all([
        Validation.sourceExists(sourceId), Validation.targetExists(targetId)
      ]);
      await ratings
        .update(
          { sourceId: sourceId, targetId: targetId },
          { $set: { rating: newRating } },
          { upsert: true });

      return true;
    },
    createSource: (root, {sourceId}) => {
      if (!sourceId) {
        sourceId = uuid();
      }

      return sources.insertOne({id: sourceId});
    },
    createTarget: (root, {targetId}) => {
      if (!targetId) {
        targetId = uuid();
      }

      return targets.insertOne({id: targetId});
    }
  }
};


const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

app.use('/graphql', bodyParser.json(), bodyParser.urlencoded({
  extended: true
}), graphqlExpress({ schema }));

app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

app.listen(config.wsPort, () => {
  console.log(`Running ${name} with config ${JSON.stringify(config)}`);
});
