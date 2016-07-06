/// <reference path="../typings/tsd.d.ts" />
import * as express from "express";
import morgan = require("morgan");
// the mongodb tsd typings are wrong and we can't use them with promises
const mongodb = require("mongodb");
const command_line_args = require("command-line-args");
const express_graphql = require("express-graphql");


const cli = command_line_args([
  {name: "dbhost", type: String, defaultValue: "localhost"},
  {name: "dbport", type: Number, defaultValue: 27017},

  {name: "wshost", type: String, defaultValue: "localhost"},
  {name: "wsport", type: Number, defaultValue: 3000},

  {name: "bushost", type: String, defaultValue: "localhost"},
  {name: "busport", type: Number, defaultValue: 3001},

  {name: "servepublic", type: Boolean},
  {name: "debugdata", type: Boolean}
]);


export class Mean {
  db; //: mongodb.Db;
  ws: express.Express;
  loc: string;
  bushost: string;
  busport: number;

  constructor(public name: string, init_db?: (db, debug) => void) {
    const opts = cli.parse();
    this.loc = `http://${opts.wshost}:${opts.wsport}`;
    this.bushost = opts.bushost;
    this.busport = opts.busport;

    console.log(`Starting MEAN ${name} at ${this.loc}`);

    const server = new mongodb.Server(
      opts.dbhost, opts.dbport, {socketOptions: {autoReconnect: true}});
    this.db = new mongodb.Db(
        `${name}-${opts.wshost}-${opts.wsport}-db`, server, {w: 1});
    this.db.open((err, db) => {
      if (err) {
        console.log("Error opening mongodb");
        throw err;
      }
      if (init_db !== undefined) {
        console.log(`Initializing db for MEAN ${name}`);
        init_db(db, opts.debugdata);
      }
    });

    this.ws = express();
    this.ws.use(morgan("dev"));

    if (opts.servepublic) {
      console.log(`Serving public folder for MEAN ${name} at ${this.loc}`);
      this.ws.use(express.static("./dist/public"));
    };

    this.ws.listen(opts.wsport, () => {
      console.log(`Listening with opts ${JSON.stringify(opts)}`);
    });
  }
}

export namespace Helpers {
  export function serve_schema(ws, graphql_schema) {
    console.log(`Serving graphql schema for MEAN`);
    const gql = express_graphql({
      schema: graphql_schema,
      pretty: true,
      formatError: e => ({
        message: e.message,
        locations: e.locations,
        stack: e.stack
      })
    });
    ws.options("/graphql", this.cors);
    ws.get("/graphql", this.cors, gql);
    ws.post("/graphql", this.cors, gql);
  }

  export function cors(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    next();
  }

  export function resolve_create(
      db: any, item_name: string, col_name?: string,
      transform_fn?: (atom: any) => any) {
    if (col_name === undefined) col_name = item_name + "s";

    return (_, {atom_id, atom}) => {
      let atom_obj = JSON.parse(atom);
      console.log(
        "got new " + item_name + "(id " + atom_id + ") from bus " + atom);
      atom_obj["atom_id"] = atom_id;
      if (transform_fn !== undefined) atom_obj = transform_fn(atom_obj);

      return db.collection(col_name)
        .insertOne(atom_obj)
        .then(res => res.insertedCount === 1);
    };
  }

  export function resolve_update(
      db: any, item_name: string, col_name?: string) {
    if (col_name === undefined) col_name = item_name + "s";

    return (_, {atom_id, update}) => {
      let update_obj = JSON.parse(update);
      console.log(
        "got update " + item_name + "(id " + atom_id + ") from bus " + update);

      return db.collection(col_name)
        .updateOne({atom_id: atom_id}, update_obj)
        .then(res => res.matchedCount === 1 && res.modifiedCount === 1);
    };
  }
}
