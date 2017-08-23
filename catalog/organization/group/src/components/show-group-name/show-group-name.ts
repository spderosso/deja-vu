import {GraphQlService} from "gql";

import {Widget, ClientBus, Field} from "client-bus";

import {GroupAtom} from "../../shared/data";

import "rxjs/add/operator/map";

@Widget({
  fqelement: "Group",
  template: `{{group.name}}`,
  ng2_providers: [GraphQlService]
})
export class ShowGroupNameComponent {
  @Field("Group") group: GroupAtom;

  constructor(
    private _graphQlService: GraphQlService, private _clientBus: ClientBus) {}

  dvAfterInit() {
    if (!this.group.atom_id || this.group.name) return;

    this._graphQlService
      .get(`
        group_by_id(atom_id: "${this.group.atom_id}") {
          name
        }
      `)
      .map(data => data.group_by_id.name)
      .subscribe(name => this.group.name = name)
  	;
  }
}