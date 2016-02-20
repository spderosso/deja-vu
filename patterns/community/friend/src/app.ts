/// <reference path="../typings/tsd.d.ts" />
import * as express from "express";
import morgan = require("morgan");
import * as mongodb from "mongodb";
let command_line_args = require("command-line-args");

import {RestBus} from "rest-bus/pack/rest.bus";


const cli = command_line_args([
  {name: "dbhost", type: String, defaultValue: "localhost"},
  {name: "dbport", type: Number, defaultValue: 27017},

  {name: "wshost", type: String, defaultValue: "localhost"},
  {name: "wsport", type: Number, defaultValue: 3000},

  {name: "bushost", type: String, defaultValue: "localhost"},
  {name: "busport", type: Number, defaultValue: 3001},

  {name: "servepublic", type: Boolean, defaultValue: true},
  {name: "debugdata", type: Boolean, defaultValue: true}
]);
const opts = cli.parse();
const bus = new RestBus(opts.bus_host, opts.bus_port);


//
// DB
//
const server = new mongodb.Server(
  opts.dbhost, opts.dbport, {auto_reconnect: true});
export const db = new mongodb.Db("frienddb", server, { w: 1 });
db.open((err, db) => {
  if (err) throw err;
  db.createCollection("users", (err, users) => {
    if (err) throw err;
    if (opts.debugdata) {
      console.log("Resetting users collection");
      users.remove((err, remove_count) => {
        if (err) throw err;
        console.log(`Removed ${remove_count} elems`);
        users.insertMany([
          {username: "benbitdiddle", friends: []},
          {username: "alyssaphacker", friends: []},
          {username: "eva", friends: []},
          {username: "louis", friends: []},
          {username: "cydfect", friends: []},
          {username: "lem", friends: []}
        ], (err, res) => { if (err) throw err; });
      });
    }
  });
});


//
// WS
//
const app = express();

app.use(morgan("dev"));
if (opts.servepublic) {
  app.use(express.static(__dirname + "/public"));
}

app.listen(opts.wsport, () => {
  console.log(`Listening with opts ${JSON.stringify(opts)}`);
});


//
// API
//
interface Request extends express.Request {
  users: mongodb.Collection;
  fields;
}

namespace Validation {
  function _exists(username, req, res, next) {
    if (!req.users) req.users = db.collection("users");
    req.users.findOne({username: username}, {_id: 1}, (err, user) => {
      if (err) return next(err);
      if (!user) {
        res.status(400);
        next(`user ${username} not found`);
      } else {
        next();
      }
    });
  }

  export function userExists(req, res, next) {
    _exists(req.params.userid, req, res, next);
  }

  export function friendExists(req, res, next) {
    _exists(req.params.friendid, req, res, next);
  }

  export function friendNotSameAsUser(req, res, next) {
    if (req.params.userid === req.params.friendid) {
      res.status(400);
      next.send("userid match friendid");
    } else {
      next();
    }
  }
}

namespace Processor {
  export function fields(req, unused_res, next) {
    const fields = req.query.fields;
    if (fields) {
      const ret = {};
      fields.split(",").forEach(e => ret[e] = 1);
      req.fields = ret;
    }
    next();
  }

  // temp hack
  export function cors(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "POST, GET, OPTIONS, PUT, DELETE");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    next();
  }
}


app.get(
  "/api/users/:userid/potential_friends",
  Validation.userExists,
  bus.crud("friends"),
  Processor.fields,
  Processor.cors,
  (req: Request, res, next) => {
    const query = {
    $and: [
      {friends: {$nin: [req.params.userid]}},
      {username: {$ne: req.params.userid}}
    ]};
    req.users.find(query, req.fields, (err, friends) => {
      if (err) return next(err);
      friends.toArray((err, arr) => {
        if (err) return next(err);
        res.json(arr);
      });
    });
  });

app.get(
  "/api/users/:userid/friends",
  Validation.userExists,
  bus.crud("friends"),
  Processor.fields,
  Processor.cors,
  (req: Request, res, next) => {
    req.users.findOne({username: req.params.userid}, (err, user) => {
      if (err) return next(err);
      if (!user.friends) {
        res.json([]);
        return;
      }
      req.users.find(
        {username: {$in: user.friends}}, req.fields,
        (err, users) => {
          if (err) return next(err);
          users.toArray((err, arr) => {
            if (err) return next(err);
            res.json(arr);
          });
        });
    });
  });

const updateOne = (users, userid, update, next) => {
  users.updateOne({username: userid}, update, (err, user) => {
    if (err) return next(err);
  });
};

// tmp hack
app.options("/api/users/:userid/friends/:friendid", Processor.cors);

app.put(
  "/api/users/:userid/friends/:friendid",
  Validation.userExists, Validation.friendExists,
  Validation.friendNotSameAsUser,
  bus.crud("friends"),
  Processor.cors,
  (req: Request, res, next) => {
    const userid = req.params.userid;
    const friendid = req.params.friendid;
    updateOne(req.users, userid, {$addToSet: {friends: friendid}}, next);
    updateOne(req.users, friendid, {$addToSet: {friends: userid}}, next);
    res.json({});
  });

app.delete(
  "/api/users/:userid/friends/:friendid",
  Validation.userExists, Validation.friendExists,
  Validation.friendNotSameAsUser,
  bus.crud("friends"),
  Processor.cors,
  (req: Request, res, next) => {
    const userid = req.params.userid;
    const friendid = req.params.friendid;
    updateOne(req.users, userid, {$pull: {friends: friendid}}, next);
    updateOne(req.users, friendid, {$pull: {friends: userid}}, next);
    res.json({});
  });
