/// <reference path="../typings/tsd.d.ts" />
// const rp = require("request-promise");

export interface Type {
  name: string;
  element: string;
  loc: string;
  fields: Field[];
}

export interface Field {
  name: string;
  "type": Type;
}

export interface TypeBond {
  types: Type[];
  subtype: Type[];
}

export interface FieldBond {
  fields: Field[];
  subfield: Field[];
}

export interface CompInfo {
  tbonds: TypeBond[];
  fbonds: FieldBond[];
}


export class Composer {
  constructor(
      private _element: string, private _loc: string,
      private _comp_info?: CompInfo) {}

  adapt_atom(to: Type, atom: any, t: Type | string) {
    let type_info;
    if (typeof t === "string") {
      type_info = {name: t, element: this._element, loc: this._loc, fields: []};
    } else {
      type_info = t;
    }
    const name_map = this._get_name_map(to, type_info);
    return new Proxy(atom, {
      get: (target, name) => target[name_map[name]],
      set: (target, name, value) => target[name_map[name]] = value
    });
  }

  report_save(t_name: string, atom_id: string, atom: any) {
    console.log(
        "Reporting save (id " + atom_id + ", t" + t_name + ") " +
        JSON.stringify(atom));
  }

  report_update(atom: any, update: any) {
    console.log(
        "Reporting up (id " + atom.atom_id + ") " +
        JSON.stringify(update));
  }

  private _get_name_map(src: Type, dst: Type) {
    return {};
  }
/*
  private _new_atom(t: any, atom_id: string, atom: any) {
    console.log("sending new atom to composer");
    const atom_str = JSON.stringify(
        this._filter_atom(t, atom)).replace(/"/g, "\\\"");
    console.log("t is " + t.name);
    console.log("atom id is " + atom_id);
    this._post(`{
      newAtom(
        type: {
          name: "${t.name}", element: "${this._element}", loc: "${this._loc}"
        },
        atom_id: "${atom_id}",
        atom: "${atom_str}")
    }`);
  }

  // no filtering update
  private _update_atom(t: any, atom_id: string, update: any) {
    console.log("sending up atom to composer");
    const update_str = JSON.stringify(update).replace(/"/g, "\\\"");
    this._post(`{
      updateAtom(
        type: {
          name: "${t.name}", element: "${this._element}", loc: "${this._loc}"
        },
        atom_id: "${atom_id}",
        update: "${update_str}")
    }`);
  }

  private _rm_atom(t: any, id: string) {
    console.log("sending rm atom to composer");
    this._post(`rm`);
  }

  private _filter_atom(t: any, atom: any) {
    let filtered_atom = {};
    for (const f of Object.keys(t._fields)) {
      const atom_f = atom[f];

      let filtered_atom_f = {};
      if (Array.isArray(atom_f)) {   // list type
        filtered_atom_f = this._filter_list(atom_f);
      } else if (typeof atom_f === "object") {  // object type
        filtered_atom_f["atom_id"] = atom_f["atom_id"];
      } else {  // scalar type
        filtered_atom_f = atom_f;
      }

      filtered_atom[f] = filtered_atom_f;
    }
    console.log(
        "BEFORE FILTER <" + JSON.stringify(atom) + "> AFTER FILTER <" +
        JSON.stringify(filtered_atom) + ">");
    return filtered_atom;
  }

  private _filter_list(l: Array<any>) {
    return l.map(atom => {
      let filtered_atom = {};
      if (typeof atom === "object") {
        filtered_atom["atom_id"] = atom["atom_id"];
      } else if (atom["Symbol.iterator"] === "function") {
        filtered_atom = this._filter_list(atom);
      } else {
        filtered_atom = atom;
      }
      return filtered_atom;
    });
  }

  private _post(query) {
    const query_str = query.replace(/ /g, "");

    const options = {
      uri: loc + "/graphql",
      method: "post",
      body: {
        query: "mutation " + query_str
      },
      json: true
    };

    console.log(
      "using options " + JSON.stringify(options) +
      " for query <" + query_str + ">");
    return rp(options)
      .then(body => {
        console.log(body);
        return body;
      });
  }
  */
}
