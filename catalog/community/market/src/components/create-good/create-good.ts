import {GraphQlService} from "gql";

import {Widget} from "client-bus";


@Widget({
  fqelement: "Market",
  ng2_providers: [GraphQlService]
})
export class CreateGoodComponent {
  seller = {atom_id: undefined};
  good = {
    atom_id: undefined,
    name: "",
    price: undefined,
    quantity: undefined
  };
  market = {atom_id: undefined};

  constructor(private _graphQlService: GraphQlService) {}

  onSubmit() {
    if (!this.seller.atom_id || !this.market.atom_id) {
      return;
    }

    this._graphQlService
      .post(`
        CreateGood(
          name: "${this.good.name}",
          price: ${this.good.price},
          quantity: ${this.good.quantity},
          seller_id: "${this.seller.atom_id}",
          market_id: "${this.market.atom_id}"
          ) {
            atom_id
          }
      `)
      .subscribe(_ => {
        this.good.atom_id = "";
        this.good.name = "";
        this.good.price = "";
        this.good.quantity = "";
      })
    ;
  }
}
