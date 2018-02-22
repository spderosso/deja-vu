const graphql = require("graphql");
// typings don't have the call with no callback
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

import {Mean} from "mean-loader";
import {Helpers} from "helpers";
import {ServerBus} from "server-bus";
import {Grafo} from "grafo";

const mean = new Mean();

const handlers = {
  user: {
    create: Helpers.resolve_create(mean.db, "user", "users", user => {
          user["password"] = bcrypt.hashSync(user.username, 10);
          return user;
        }),
    update: Helpers.resolve_update(mean.db, "user")
  }
};

const bus = new ServerBus(
    mean.fqelement, mean.ws, handlers, mean.comp, mean.locs);

//////////////////////////////////////////////////

const grafo = new Grafo(mean.db);

const schema = grafo
  .add_type({
    name: "User",
    fields: {
      username: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
    }
  })
  .add_query({
    name: "user",
    "type": "User",
    args: {
      username: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
    },
    resolve: (root, {username}) => {
      console.log(`getting ${username}`);
      // const fields = {username: 1, friends: {username: 1}}; TODO: project
      return mean.db.collection("users").findOne({username: username});
    }
  })
  .add_mutation({
    name: "register",
    "type": graphql.GraphQLString,
    args: {
      username: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
      password: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {username, password}) => {
      return Validation.userIsNew(username).then(_ => {
        // TODO: promisify
        const hash = bcrypt.hashSync(password, 10);
        const user = {
          // Note: We use username as atom ID. Guaranteed to be unique
          // by Validation.userIsNew
          username: username, password: hash, atom_id: username};
        return mean.db.collection("users")
          .insertOne(user)
          .then(write_res => {
            if (write_res.insertedCount !== 1) {
              throw new Error("Couldn't save new user");
            }
            // report
            return bus.create_atom("User", user.atom_id, user);
          })
          .then(_ => user.atom_id);
      });
    }
  })
  .add_mutation({
    name: "signIn",
    "type": graphql.GraphQLString,
    args: {
      username: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
      password: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {username, password}) => {
      return Validation.userExists(username).then(user => {
        // TODO: promisify
        if (!bcrypt.compareSync(password, user.password)) {
          throw new Error("Incorrect password");
        }
        const token = jwt.sign(username, "ultra-secret-key");
        return JSON.stringify({
          token: token,
          user: user
        });
      });
    }
  })
  .add_mutation({
    name: "changePassword",
    "type": graphql.GraphQLBoolean,
    args: {
      username: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
      oldPassword: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
      newPassword: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)}
    },
    resolve: (_, {username, oldPassword, newPassword}) => {
      return Validation.userExists(username).then(user => {
        if (!bcrypt.compareSync(oldPassword, user.password)) {
          throw new Error("Incorrect password");
        }

        const newPasswordHash = bcrypt.hashSync(newPassword, 10);
        const updateOperation = {$set: {password: newPasswordHash}};

        return mean.db.collection("users")
          .updateOne({username: username}, updateOperation)
          .then(write_res => {
            if (write_res.modifiedCount !== 1) {
              throw new Error("Couldn't save new password");
            }

            // report
            return bus.update_atom("User", user.atom_id, updateOperation);
          })
          .then(_ => true);
      });
    }
  })
 .schema();


namespace Validation {
  export function userExists(username) {
    return mean.db.collection("users")
      .findOne({username: username})
      .then(user => {
        if (!user) throw new Error(`${username} doesn't exist`);
        return user;
      });
  }

  export function userIsNew(username) {
    return mean.db.collection("users")
      .findOne({username: username}, {_id: 1})
      .then(user => {
        if (user) throw new Error(`${username} exists`);
        return user;
      });
  }
}

Helpers.serve_schema(mean.ws, schema);

grafo.init().then(_ => mean.start());
