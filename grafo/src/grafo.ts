/// <reference path="../typings/tsd.d.ts" />
const graphql = require("graphql");

import * as _u from "underscore";


export class Grafo {
  types: any = {};

  constructor(private db) {}

  add_type(t) {
    this.types[t.name] = t;
    return this;
  }

  schema() {
    const process_type = (f, f_name) => {
      if (!_u.isString(f.type)) return f;

      const match = f.type.match(/\[(\w+)\]/);
      if (match !== null) {
        const f_type = this.types[match[1]];
        if (f.resolve === undefined) {
          f.resolve = src => {
            const collection = this.db.collection(f_name);
            const target = src[f_name];
            if (_u.isEmpty(target)) return [];
            return collection
              .find({atom_id: {$in: target.map(t => t.atom_id)}})
              .toArray();
          };
        }
        f.type = new graphql.GraphQLList(f_type);
      } else {
        if (f.resolve === undefined) {
          f.resolve = src => this.db.collection(f_name + "s")
            .findOne({atom_id: src[f_name].atom_id});
        }
        f.type = this.types[f.type];
      }
      return f;
    };

    this.types = _u.mapObject(this.types, t => {
      let f = t.fields;
      if (_u.isFunction(f)) {
        f = t.fields();
      }
      t.fields = () => _u.mapObject(f, process_type);
      return t;
    });
    this.types = _u.mapObject(this.types, t => {
      return new graphql.GraphQLObjectType(t);
    });

    const queries = {};
    _u.each(this.types, (t, t_name: string) => {
      queries[t_name.toLowerCase() + "_by_id"] = {
        "type": t,
        args: {
          atom_id: {"type": new graphql.GraphQLNonNull(graphql.GraphQLString)},
        },
        resolve: (root, {atom_id}) => this.db
          .collection(t_name.toLowerCase() + "s").findOne({atom_id: atom_id})
      };
    });

    return new graphql.GraphQLSchema({
      query: new graphql.GraphQLObjectType({name: "Query", fields: queries})
    });
  }
}
