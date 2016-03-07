/// <reference path="../typings/tsd.d.ts" />
// import {Promise} from "es6-promise";
const graphql = require("graphql");
// the mongodb tsd typings are wrong and we can't use them with promises
const mean_mod = require("mean");


let mean;


const pub_type = new graphql.GraphQLObjectType({
  name: "Publisher",
  fields: {
    name: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
    published: {
      "type": new graphql.GraphQLList(graphql.GraphQLString),
      resolve: pub => pub.published
    }
  }
});

const sub_type = new graphql.GraphQLObjectType({
  name: "Subscriber",
  fields: {
    name: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
    subscriptions: {
      "type": new graphql.GraphQLList(pub_type),
      resolve: sub => mean.db.collection("pubs")
        .find({name: {$in: sub.subscriptions}})
        .toArray()
    }
  }
});


/*
const pub_input_type = new graphql.GraphQLInputObjectType({
  name: "PublisherInput",
  fields: {
    name: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
    published: {"type": new graphql.GraphQLList(graphql.GraphQLString)}
  }
});

const sub_input_type = new graphql.GraphQLInputObjectType({
  name: "SubscriberInput",
  fields: {
    name: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
    subscriptions: {"type": new graphql.GraphQLList(pub_input_type)}
  }
});

const fields = ast => ast.fields.selections.reduce((fields, s) => {
  fields[s.name.value] = 1;
  return fields;
}, {});*/

const schema = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: "Query",
    fields: {
      sub: {
        "type": sub_type,
        args: {
          name: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
        },
        resolve: (root, {name}) => {
          console.log(`getting ${name}`);
          // const fields = {username: 1, friends: {username: 1}}; TODO: project
          return mean.db.collection("subs").findOne({name: name});
        }
      }
    }
  }),

  mutation: new graphql.GraphQLObjectType({
    name: "Mutation",
    fields: {
      _dv_new_subscriber: {
        "type": graphql.GraphQLBoolean,
        args: {
          atom: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)}
        },
        resolve: (root, args) => {
          const sub = JSON.parse(args.atom);
          console.log("got new sub from bus " + JSON.stringify(sub));
          return true;
        }
      },
      _dv_new_publisher: {
        "type": graphql.GraphQLBoolean,
        args: {
          atom: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)}
        },
        resolve: (root, args) => {
          const pub = JSON.parse(args.atom);
          console.log("got new pub from bus " + JSON.stringify(pub));
          return true;
        }
      }
    }
  })
});


/*
namespace Validation {
  export function sub_exists(name) {
    return mean.db.collection("usbs")
      .findOne({name: name}, {_id: 1})
      .then(user => {
        if (!user) throw new Error(`${name} doesn't exist`);
      });
  }
}
*/

mean = new mean_mod.Mean("feed", {
  graphql_schema: schema,
  init_db: (db, debug) => {
    db.createCollection("subs", (err, subs) => {
      if (err) throw err;
      if (debug) {
        subs.remove((err, remove_count) => {
          if (err) { console.log(err); return; }
          console.log(`Removed ${remove_count} elems`);

          subs.insertMany([
            {name: "Ben", subscriptions: [
              "Software Engineering News", "Things Ben Bitdiddle Says"]},
            {name: "Alyssa", subscriptions: []}
          ], (err, res) => { if (err) throw err; });
        });
      }
    });

    db.createCollection("pubs", (err, pubs) => {
      if (err) throw err;
      pubs.remove((err, remove_count) => {
        if (err) throw err;
        if (debug) {
         pubs.insertMany([
           {name: "Software Engineering News", published: [
             "Node v0.0.1 released!"]},
           {name: "Things Ben Bitdiddle Says", published: ["Hi"]},
           {name: "U.S News", published: []},
           {name: "World News", published: []},
           {name: "New Books about Zombies", published: []}
         ], (err, res) => { if (err) throw err; });
        }
      });
    });
  }
});
