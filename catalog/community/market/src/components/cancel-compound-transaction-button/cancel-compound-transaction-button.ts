import {GraphQlService} from "gql";
import {Widget, Field} from "client-bus";
import {CompoundTransactionAtom} from "../../shared/data";

@Widget({
  fqelement: "Market",
  ng2_providers: [GraphQlService]
})
export class CancelCompoundTransactionButtonComponent {
  @Field("CompoundTransaction") compoundTransaction: CompoundTransactionAtom;

  constructor(private _graphQlService: GraphQlService) {}

  cancelCompoundTransaction() {
    if (!this.compoundTransaction.atom_id) return;

    this._graphQlService
      .post(`
        CancelCompoundTransaction(
          compound_transaction_id: "${this.compoundTransaction.atom_id}"
        )
      `)
      .subscribe(_ => {
        this.compoundTransaction.transactions.forEach(transaction => {
          transaction.status = "canceled";
        });
      });
  }
}