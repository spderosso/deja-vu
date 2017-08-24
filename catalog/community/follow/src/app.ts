import {Promise} from "es6-promise";
const graphql = require("graphql"); // TODO: do properly once grafo typing fixed
import * as uuid from "uuid";

import {Mean} from "mean-loader";
import {Helpers} from "helpers";
import {ServerBus} from "server-bus";
import {Grafo} from "grafo";

import {Follower, Publisher, Message} from "./_shared/data";


const mean = new Mean();

const handlers = {
  publisher: {
    create: Helpers.resolve_create(mean.db, "publisher"),
    update: Helpers.resolve_update(mean.db, "publisher")
  },
  follower: {
    create: Helpers.resolve_create(mean.db, "follower"),
    update: Helpers.resolve_update(mean.db, "follower")
  },
  message: {
    create: Helpers.resolve_create(mean.db, "message"),
    update: Helpers.resolve_update(mean.db, "message")
  }
};

const bus = new ServerBus(
  mean.fqelement,
  mean.ws,
  handlers,
  mean.comp,
  mean.locs
);


//////////////////////////////////////////////////

const grafo = new Grafo(mean.db);

const schema = grafo
  .add_type({
    name: "Follower",
    fields: {
      atom_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      name: {type: graphql.GraphQLString},
      follows: {
        type: "[Publisher]",
        resolve: (follower: Follower, {}) => {
          const ids = follower.follows.map(publisher => publisher.atom_id);
          return mean.db.collection("publishers")
            .find({atom_id: {$in: ids}})
            .toArray();
        }
      }
    }
  })
  .add_type({
    name: "Publisher",
    fields: {
      atom_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      name: {type: graphql.GraphQLString}
    }
  })
  .add_type({
    name: "Message",
    fields: {
      atom_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      content: {type: graphql.GraphQLString}
    }
  })
  .add_mutation({
    name: "createFollower",
    type: graphql.GraphQLString,
    args: {},
    resolve: (_, {}) => {
      let newFollower = {
        atom_id: uuid.v4(),
        name: "",
        follows: []
      };
      return create(newFollower, "Follower", "followers");
    }
  })
  .add_mutation({
    name: "createPublisher",
    type: graphql.GraphQLString,
    args: {},
    resolve: (_, {}) => {
      let newPublisher = {
        atom_id: uuid.v4(),
        name: ""
      };
      return create(newPublisher, "Publisher", "publishers");
    }
  })
  .add_mutation({
    name: "createMessage",
    type: graphql.GraphQLString,
    args: {},
    resolve: (_, {}) => {
      let newMessage = {
        atom_id: uuid.v4(),
        content: ""
      };
      return create(newMessage, "Message", "messages");
    }
  })
  // getPublishersByFollower -- just use follower_by_id
  .add_query({
    name: "getMessagesByFollower",
    type: "[Messages]",
    args: {
      follower_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {follower_id}) => {
      return mean.db.collection("followers")
        .findOne({atom_id: follower_id})
        .then((follower: Follower) => {
          const ids = follower.follows.map(publisher => publisher.atom_id);
          return mean.db.collection("messages")
            .find({author: {atom_id: {$in: ids}}})
            .toArray();
        })
    }
  })
  .add_query({
    name: "getFollowersByPublisher",
    type: "[Follower]",
    args: {
      publisher_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {publisher_id}) => {
      return mean.db.collection("followers")
        .find({follows: {atom_id: publisher_id}})
        .toArray();
    }
  })
  .add_query({
    name: "getMessagesByPublisher",
    type: "[Message]",
    args: {
      publisher_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {publisher_id}) => {
      return mean.db.collection("messages")
        .find({author: {atom_id: publisher_id}})
        .toArray();
    }
  })
  .add_mutation({
    name: "updateNameOfFollower",
    type: graphql.GraphQLBoolean,
    args: {
      follower_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      name: graphql.GraphQLString
    },
    resolve: (_, {follower_id, name}): Promise<boolean> => {
      return rename(follower_id, name, "Follower", "followers");
    }
  })
  .add_mutation({
    name: "updateNameOfPublisher",
    type: graphql.GraphQLBoolean,
    args: {
      publisher_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      name: graphql.GraphQLString
    },
    resolve: (_, {publisher_id, name}): Promise<boolean> => {
      return rename(publisher_id, name, "Publisher", "publishers");
    }
  })
  .add_mutation({
    name: "updateNameOfMessage",
    type: graphql.GraphQLBoolean,
    args: {
      message_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      name: graphql.GraphQLString
    },
    resolve: (_, {message_id, name}): Promise<boolean> => {
      return rename(message_id, name, "Message", "messages");
    }
  })
  .add_mutation({
    name: "follow",
    type: graphql.GraphQLBoolean,
    args: {
      follower_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      publisher_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {follower_id, publisher_id}): Promise<boolean> => {
      return updateFollow(follower_id, publisher_id, false);
    }
  })
  .add_mutation({
    name: "unfollow",
    type: graphql.GraphQLBoolean,
    args: {
      follower_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)},
      publisher_id: {type: new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {follower_id, publisher_id}): Promise<boolean> => {
      return updateFollow(follower_id, publisher_id, true);
    }
  })
  .schema();

Helpers.serve_schema(mean.ws, schema);

grafo.init().then(_ => mean.start());


// creates an entity
function create(
  newObject: {atom_id: string},
  type: string,
  collection: string
): Promise<string> {
  return mean.db.collection("followers")
    .insertOne(newObject)
    .then(res => {
      if (res.insertedID) {
        return bus.create_atom(collection, newObject.atom_id, newObject);
      }
      return false;
    })
    .then(success => success ? newObject.atom_id : "");
}

// renames entitiy with atom_id to name
function rename(
  atom_id: string,
  name: string,
  type: string,
  collection: string
): Promise<boolean> {
  const updateObj = {$set: {name: name}};
  return updateOne(atom_id, updateObj, type, collection);
}

// Updates a single record by atom_id
function updateOne(
  atom_id: string,
  updateObj: object,
  type: string,
  collection: string
): Promise<boolean> {
  return mean.db.collection(collection)
    .updateOne({atom_id: atom_id}, updateObj)
    .then(res => {
      if (res.modifiedCount) {
        return bus.update_atom(type, atom_id, updateObj)
      }
      return !!res.matchedCount;
    });
}

// do a follow or unfollow
function updateFollow(
  follower_id: string,
  publisher_id: string,
  un: boolean
): Promise<boolean> {
  const updateObj = {
    [un ? "$pull": "$addToSet"]: {follows: {atom_id: publisher_id}}
  };
  return updateOne(follower_id, updateObj, "Follower", "followers");
}
