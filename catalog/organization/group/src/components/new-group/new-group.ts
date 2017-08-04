import {Widget, Field, PrimitiveAtom} from "client-bus";
import {GraphQlService} from "gql";

import {ParentAtom} from "../../shared/data";
import {createGroup} from "../../shared/services";


@Widget({
  fqelement: "Group",
  ng2_providers: [GraphQlService]
})
export class NewGroupComponent {
  @Field("Group") group : ParentAtom;
  @Field("boolean") submit_ok: PrimitiveAtom<boolean>;

  constructor(private _graphQlService: GraphQlService) {}

  dvAfterInit() {
    this.submit_ok.on_after_change(() => {
      if (this.submit_ok.value) {
        this.submit_ok.value = false;
        this.group.atom_id = "";
      }
    });
  }

  submit() {
    createGroup(this._graphQlService)
      .then(atom_id => {
        if (atom_id) {
          this.group.atom_id = atom_id;
          this.submit_ok.value = true;
        }
      });
  }
}
