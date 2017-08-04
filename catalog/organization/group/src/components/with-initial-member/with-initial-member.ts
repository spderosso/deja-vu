import {Widget, Field, PrimitiveAtom} from "client-bus";
import {GraphQlService} from "gql";

import {NamedAtom, ParentAtom} from "../../shared/data";
import {addMemberToParent} from "../../shared/services";


@Widget({
  fqelement: "Group",
  ng2_providers: [GraphQlService],
  template: ``
})
export class WithInitialMemberComponent {
  @Field("Group | Subgroup") parent: ParentAtom;
  @Field("Member") member: NamedAtom;
  @Field("boolean") submit_ok: PrimitiveAtom<boolean>;

  req: Promise<boolean> = null;

  constructor(private _graphQlService: GraphQlService) {}

  dvAfterInit() {
    this.submit_ok.on_change(() => {
      if (
        this.submit_ok.value === true &&
        this.parent.atom_id &&
        this.member.atom_id
      ) {
        this.req = addMemberToParent(
          this._graphQlService,
          this.parent.atom_id,
          this.member.atom_id
        );
      }
    });

    this.submit_ok.on_after_change(() => {
      if (this.req) this.req.then(success => {
        this.req = null;
      });
    });
  }
}
