const ohm = require("ohm-js");
import * as fs from "fs";
import * as path from "path";

import * as _u from "underscore";


export interface Widget {
  name: string;
  fqelement: string;
}

export interface UsedClicheMap { [cliche: string]: number; }
export interface ClicheMap {
  [alias: string]: {fqelement: string, name: string};
}
export interface FieldType { [f_name: string]: string; }
export interface FieldTypesMap { [of_name: string]: FieldType; }
export interface FieldMap {
  [src_field: string]: string;
}
export interface WidgetReplaceMap {
  [w_name: string]: {
    replaced_by: Widget, map: FieldMap;
  };
}
export interface ReplaceMap { [cliche: string]: WidgetReplaceMap; }
export interface Cliche {
  used_cliches: UsedClicheMap;
  cliche_map: ClicheMap;
  ft_map: FieldMap;
  replace_map: ReplaceMap;
  fqelement: string;
  // tbd
  uft_map: any;
  used_widgets: any[];
  main_widget: string;
  widgets: any[];
  tbonds: any[];
  fbonds: any[];
  wbonds: any[];
}

export class Parser {
  cliche_map; of_name; name; ft_map;
  private _grammar;
  private _semantics;

  constructor() {
    const grammar_path = path.join(__dirname, "grammar.ohm");
    this._grammar = ohm.grammar(fs.readFileSync(grammar_path, "utf-8"));
    this._semantics = this._grammar.createSemantics()
      .addOperation("tbonds", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          this.cliche_map = this._get_cliche_map(name.sourceString, uses);
          return _u
            .chain(para.tbonds())
            .flatten()
            .reject(_u.isEmpty)
            .value();
        },
        Paragraph_widget: decl => [],
        Paragraph_data: decl => decl.tbonds(),
        DataDecl: (data, name, key1, fields, key2, bond) => {
          const subtype = name.sourceString;
          const mapped_cliche = this.cliche_map["this"];
          return _u
            .chain(bond.tbonds())
            .reject(_u.isEmpty)
            .map(tbond => ({
              subtype: {
                name: subtype, "of": {
                  name: this.of_name, fqelement: mapped_cliche.fqelement
                }
              },
              types: _u.reject(tbond, _u.isEmpty)
            }))
            .value();
        },
        DataBondDecl: (eq, data_bond, bar, data_bonds) => {
          return [data_bond.tbonds(), data_bonds.tbonds()];
        },
        DataBond: (data_bond_name, plus, data_bond_names) => {
          return [].concat(data_bond_name.tbonds())
            .concat(_u.flatten(data_bond_names.tbonds()));
        },
        dataBondName_other: (cliche, dot, name) => {
          const cliche_name = cliche.sourceString;
          const mapped_cliche = this.cliche_map[cliche_name];
          if (!mapped_cliche) {
            throw new Error(`Can't find cliche ${cliche_name}`);
          }
          return {name: name.sourceString, fqelement: mapped_cliche.fqelement};
        },
        dataBondName_this: name => {
          const mapped_cliche = this.cliche_map["this"];
          return {name: name.sourceString, fqelement: mapped_cliche.fqelement};
        }
      })
      .addOperation("fbonds", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          const cliche_name = name.sourceString;
          this.cliche_map = uses.clicheMap()[0];
          if (this.cliche_map === undefined) this.cliche_map = {};
          this.cliche_map["this"] = {
            fqelement: `dv-samples-${cliche_name.toLowerCase()}`,
            name: cliche_name
          };
          this.ft_map = this._build_uses_ft_map(uses);
          return _u
            .chain(para.fbonds())
            .flatten()
            .reject(_u.isEmpty)
            .value();
        },
        Paragraph_widget: decl => [],
        Paragraph_data: decl => decl.fbonds(),
        DataDecl: (data, name, key1, fields, key2, bond) => {
          this.of_name = name.sourceString;
          return fields.fbonds();
        },
        FieldBody: (field_decl, comma, field_decls) => {
          return [].concat(field_decl.fbonds())
            .concat(_u.flatten(field_decls.fbonds()));
        },
        FieldDecl: (name, colon, t, field_bond_decl) => {
          const subfield = name.sourceString;
          const mapped_cliche = this.cliche_map["this"];
          const field_bonds = field_bond_decl.fbonds()[0];
          return _u
            .chain(field_bonds)
            .reject(_u.isEmpty)
            .map(fbond => {
              return {
                subfield: {
                  name: subfield, "of": {
                    name: this.of_name, fqelement: mapped_cliche.fqelement
                  },
                  "type": {
                    name: t.sourceString, fqelement: mapped_cliche.fqelement
                  }
                },
                fields: fbond
              };
            })
            .value();
        },
        FieldBondDecl: (eq, field_bond, bar, field_bonds) => {
          return [field_bond.fbonds(), _u.flatten(field_bonds.fbonds())];
        },
        FieldBond: (field_bond_name, plus, field_bond_names) => {
          return [].concat(field_bond_name.fbonds())
            .concat(field_bond_names.fbonds());
        },
        fieldBondName_other: (cliche, dot1, t, dot2, name) => {
          const cliche_name = cliche.sourceString;
          const mapped_cliche = this.cliche_map[cliche_name];
          if (!mapped_cliche) {
            throw new Error(`Can't find cliche ${cliche_name}`);
          }
          let ft_key = mapped_cliche.fqelement;
          if (ft_key.split("-").length === 4) ft_key = ft_key.slice(0, -2);
          let ft_name = this.ft_map[ft_key][t.sourceString];
          if (!ft_name) {
            throw new Error(
              `Can't find type ${t.sourceString} of ${cliche_name}` +
              ` used in ${cliche_name}.${t.sourceString}.${name.sourceString}`
            );
          }
          ft_name = ft_name[name.sourceString];
          if (!ft_name) {
            throw new Error(
              `Can't find field ${name.sourceString} of ${t.sourceString} on ` +
              `cliche ${cliche_name}`);
          }

          return {
            name: name.sourceString, "of": {
              name: t.sourceString,
              fqelement: mapped_cliche.fqelement
            },
            "type": {
              name: ft_name,
              fqelement: mapped_cliche.fqelement
            }
          };
        },
        fieldBondName_this: (t, dot2, name) => {
          const mapped_cliche = this.cliche_map["this"];
          return {
            name: name.sourceString, "of": {
              name: t.sourceString,
              fqelement: mapped_cliche.fqelement
            }
          };
        }
      })
      .addOperation("wbonds", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          return _u
            .chain(para.wbonds())
            .flatten()
            .reject(_u.isEmpty)
            .value();
        },
        Paragraph_widget: decl => decl.wbonds(),
        Paragraph_data: decl => [],
        WidgetDecl: (m, w, n1, route_decl, wU, k1, fields, k2, r) => {
          return _u.flatten(fields.fbonds());
        }
      })
      .addOperation("widgets", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => _u
          .filter(para.widgets(), w => !_u.isEmpty(w)),
        Paragraph_widget: decl => decl.widgets(),
        Paragraph_data: decl => [],
        WidgetDecl: (m, w, n1, route_decl, wUses, k1, fields, k2, r) => {
          const ret:{name?: string, path?: string, children?: any[]} = {};
          ret.name = n1.sourceString;
          const path = route_decl.widgets();
          if (!_u.isEmpty(path)) ret.path = path[0];
          const children = _u.chain(wUses.widgets())
            .flatten().filter(c => !_u.isEmpty(c)).value();
          if (!_u.isEmpty(children)) ret.children = children;
          return ret;
        },
        WidgetUsesDecl: (u, used_widget, comma, used_widgets) => []
          .concat(_u.filter([used_widget.widgets()], c => !_u.isEmpty(c)))
          .concat(_u
            .chain(used_widgets.widgets()).flatten()
            .filter(c => !_u.isEmpty(c))
            .value()),
        UsedWidgetDecl: (used_widget_name, as_decl, route_decl) => {
          const ret:{name?: string, path?: string} = {};
          const name = used_widget_name.widgets();
          const path = route_decl.widgets();
          if (name) ret.name = name;
          if (!_u.isEmpty(path)) ret.path = path[0];
          return ret;
        },
        usedWidgetName: (cliche, dot, name) => {
          return (!cliche.sourceString) ? name.sourceString : "";
        },
        RouteDecl: (route, quote1, name, quote2) => name.sourceString
      })
      .addOperation("main", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => _u
          .find(para.main(), m => m),
        Paragraph_widget: decl => decl.main(),
        Paragraph_data: decl => "",
        WidgetDecl: (m, w, n1, route, wUses, k1, fields, k2, r) => m.
          sourceString ? n1.sourceString : ""
      })
      .addOperation("usedCliches", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          const ret = {};
          const uses_used_cliches = uses.usedCliches()[0];
          if (uses_used_cliches !== undefined) {
            uses_used_cliches.forEach(c => {
              ret[c] = (ret[c] === undefined) ? 1 : ret[c] + 1;
            });
          }
          return ret;
        },
        ClicheUsesDecl: (uses, name1, asDecl1, comma, name2, asDecl2) => []
          .concat(name1.usedCliches()).concat(name2.usedCliches()),
        usedClicheName: (category, slash, name) => {
          return `dv-${category.sourceString}-` +
            name.sourceString.toLowerCase();
        }
      })
      // A map of cliche -> of -> field name -> type name
      .addOperation("usesFieldTypesMap", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          return this._build_uses_ft_map(uses);
        }
      })
      // A map of of -> field name -> type name
      .addOperation("fieldTypesMap", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          const ftmap = para.fieldTypesMap();
          return _u
            .reduce(ftmap, (memo, ft) => {
              if (memo[ft.of] !== undefined) {
                throw new Error("Duplicate type " + ft.of);
              }
              memo[ft.of] = _u
                .reduce(ft.fields, (memo, ft) => {
                  if (memo[ft.name] !== undefined) {
                    throw new Error("Duplicate field " + ft.name);
                  }
                  memo[ft.name] = ft.t;
                  return memo;
                }, {});
              return memo;
            }, {});
        },
        Paragraph_widget: decl => decl.fieldTypesMap(),
        Paragraph_data: decl => decl.fieldTypesMap(),
        DataDecl: (data, name, key1, fields, key2, bond) => {
          return {
            "of": name.sourceString,
            fields: _u.flatten(fields.fieldTypesMap())
          };
        },
        WidgetDecl: (m, w, name, route_decl, wU, k1, fields, k2, r) => {
          return {
            "of": name.sourceString,
            fields: _u.flatten(fields.fieldTypesMap())
          };
        },
        FieldBody: (field_decl, comma, field_decls) => {
          return [].concat(field_decl.fieldTypesMap())
            .concat(_u.flatten(field_decls.fieldTypesMap()));
        },
        FieldDecl: (name, colon, t, field_bond_decl) => {
          return {name: name.sourceString, t: t.sourceString};
        }
      })
      // A map of alias -> {alias, fqelement, type name}
      .addOperation("clicheMap", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          const cliche_name = name.sourceString;
          let ret = uses.clicheMap()[0];
          if (ret === undefined) ret = {};
          ret["this"] = {
            fqelement: `dv-samples-${cliche_name.toLowerCase()}`,
            name: cliche_name
          };
          return ret;
        },
        ClicheUsesDecl: (uses, name1, asDecl1, comma, name2, asDecl2) => {
          function get_list() {
            const name1_used_cliche_map = name1.clicheMap();
            return []
              .concat({
                alias: asDecl1.clicheMap()[0],
                fqelement: name1_used_cliche_map.fqelement,
                name: name1_used_cliche_map.name
              })
              .concat(
                _u.map(
                  _u.zip(asDecl2.clicheMap(), name2.clicheMap()),
                  alias_cliche => ({
                    alias: alias_cliche[0][0],
                    fqelement: alias_cliche[1].fqelement,
                    name: alias_cliche[1].name
                  })
                )
              );
          }
          const ret = {};

          const seen_names = {};
          const have_multiple = {};
          const count = {};
          const list_of_entries = get_list();
          _u.flatten(list_of_entries).forEach(c => {
            if (c.alias) {
              if (seen_names[c.name]) {
                have_multiple[c.name] = true;
              }
              seen_names[c.name] = true;
            }
          });
          _u.flatten(list_of_entries).forEach(c => {
            if (have_multiple[c.name]) {
              if (count[c.name] === undefined) {
                count[c.name] = 1;
              } else {
                count[c.name] = count[c.name] + 1;
              }
              c.fqelement = c.fqelement + "-" + count[c.name];
            }
            ret[c.alias ? c.alias : c.name] = c;
          });
          return ret;
        },
        AsDecl: (_, name) => {
          return name.sourceString;
        },
        usedClicheName: (category, slash, name) => ({
          name: name.sourceString,
          fqelement: `dv-${category.sourceString}-` +
            `${name.sourceString.toLowerCase()}`
        })
      })
      .addOperation("usedWidgets", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          const cliche_map = uses.clicheMap()[0];
          return _u.chain(para.usedWidgets()).flatten()
             // Ignore widgets that are of the current cliche
            .filter(w => cliche_map[w.cliche])
            .map(w => {
              const mapped_cliche = cliche_map[w.cliche];
              if (!mapped_cliche) {
                throw new Error(`Can't find cliche ${w.cliche}`);
              }
              return {name: w.name, fqelement: mapped_cliche.fqelement};
            })
            .value();
        },
        Paragraph_widget: decl => decl.usedWidgets(),
        Paragraph_data: decl => [],
        WidgetDecl: (
          m, w, n1, route, wUses, k1, fields, k2, r) => wUses.usedWidgets(),
        WidgetUsesDecl: (u, used_widget1, comma, used_widgets) => []
          .concat(used_widget1.usedWidgets())
          .concat(used_widgets.usedWidgets()),
        UsedWidgetDecl: (name, as_decl, route) => name.usedWidgets(),
        usedWidgetName: (cliche, dot, name) => ({
          name: name.sourceString, cliche: cliche.sourceString.slice(0, -1)
        })
      })
      // widget that is replaced -> replacement -> w field -> replacement field
      .addOperation("replaceMap", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          this.cliche_map = this._get_cliche_map(name.sourceString, uses);
          const rmap = _u
            .chain(para.replaceMap())
            .flatten()
            .reject(_u.isEmpty)
            .value();
          return _u
            .reduce(rmap, (memo, r) => {
              const r_name = {};
              r_name[r.widget.name] = _u.pick(r, "replaced_by", "map");
              memo[r.widget.fqelement] = r_name;
              return memo;
            }, {});
        },
        Paragraph_widget: decl => decl.replaceMap(),
        Paragraph_data: decl => ({}),
        WidgetDecl: (
          m, w, name, route, wUses, k1, fields, k2, r) => {
            this.name = name.sourceString;
            return r.replaceMap();
          },
        ReplacesDecl: (r, r_name, k1, r_map, k2) => {
          return {
            widget: r_name.replaceMap(),
            replaced_by: {
              name: this.name,
              fqelement: this.cliche_map["this"].fqelement
            },
            map: r_map.replaceMap()[0]
          };
        },
        replaceName: (cliche, dot, widget) => {
          return {
            name: widget.sourceString,
            fqelement: this.cliche_map[cliche.sourceString].fqelement
          };
        },
        ReplaceMap: (n1, eq, n2) => {
          const ret = {};
          ret[n2.sourceString] = n1.sourceString;
          return ret;
        }
      })
      .addOperation("fqelement", {
        ClicheDecl: (cliche, name, uses, key1, para, key2) => {
          const cliche_name = name.sourceString;
          return `dv-samples-${cliche_name.toLowerCase()}`;
        }
      });
  }


  parse(fp: string): Cliche {
    const dv = fs.readFileSync(fp, "utf-8");
    const r = this._grammar.match(dv);
    if (r.failed()) {
      throw new Error(r.message);
    }
    const s = this._semantics(r);
    return {
      used_cliches: s.usedCliches(),
      cliche_map: s.clicheMap(),
      ft_map: s.fieldTypesMap(),
      replace_map: s.replaceMap(),
      fqelement: s.fqelement(),
      uft_map: s.usesFieldTypesMap(),
      used_widgets: s.usedWidgets(),
      main_widget: s.main(),
      widgets: s.widgets(),
      tbonds: s.tbonds(),
      fbonds: s.fbonds(),
      wbonds: s.wbonds()
    };
  }

  debug_match(fp: string) {
    const p = this.parse(fp);
    const debug = obj => JSON.stringify(obj, null, 2);

    console.log("//////////Used Cliches//////////");
    console.log(debug(p.used_cliches));
    console.log("//////////Cliche Map//////////");
    console.log(debug(p.cliche_map));
    console.log("//////////Field Types Map//////////");
    console.log(debug(p.ft_map));
    console.log("//////////Replace Map//////////");
    console.log(debug(p.replace_map));
    console.log("//////////Uses Field Types Map//////////");
    console.log(debug(p.uft_map));
    console.log("//////////Used Widgets//////////");
    console.log(debug(p.used_widgets));
    console.log(`//////////Main widget is ${p.main_widget}//////////`);
    console.log("//////////Widgets//////////");
    console.log(debug(p.widgets));
    console.log("//////////tbonds//////////");
    console.log(debug(p.tbonds));
    console.log("//////////fbonds//////////");
    console.log(debug(p.fbonds));
    console.log("//////////wbonds//////////");
    console.log(debug(p.wbonds));
  }

  private _build_uses_ft_map(uses) {
    const dv_grammar = this._grammar;
    const dv_semantics = this._semantics;
    function get_fp(cliche) {
      const cliche_split = cliche.split("-");
      const category = cliche_split[1];
      const name = cliche_split[2];
      return `../../catalog/${category}/${name}/${name}.dv`;
    }
    function get_ftmap(cliche) {
      const dv = fs.readFileSync(get_fp(cliche), "utf-8");
      const r = dv_grammar.match(dv);
      if (r.failed()) {
        throw new Error("Failed to parse " + cliche + " " + r.message);
      }
      return dv_semantics(r).fieldTypesMap();
    }

    const used_cliches = _u.uniq(_u.flatten(uses.usedCliches()));
    return _u
      .reduce(used_cliches, (memo, c) => {
        memo[c] = get_ftmap(c);
        return memo;
      }, {});
  }

  private _get_cliche_map(cliche_name, uses) {
    let ret = uses.clicheMap()[0];
    if (ret === undefined) ret = {};
    ret["this"] = {
      fqelement: `dv-samples-${cliche_name.toLowerCase()}`,
      name: cliche_name
    };
    return ret;
  }
}