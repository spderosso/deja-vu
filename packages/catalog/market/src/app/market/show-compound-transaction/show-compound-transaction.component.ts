import { Component, ElementRef, Input, Type } from '@angular/core';

import { Action, GatewayService, GatewayServiceFactory } from 'dv-core';

import {
  ShowTransactionComponent
} from '../show-transaction/show-transaction.component';

import { CompoundTransaction } from "../shared/market.model";


@Component({
  selector: 'market-show-compound-transaction',
  templateUrl: './show-compound-transaction.component.html',
  styleUrls: ['./show-compound-transaction.component.css'],
})
export class ShowCompoundTransactionComponent {
  @Input() compoundTransaction: CompoundTransaction;

  @Input() showId = true;
  @Input() showTransactions = true;
  @Input() showTotalPrice = true;
  @Input() showStatus = true;

  // For showTransaction
  @Input() showTransactionId = true;
  @Input() showSummary = true;
  @Input() showGoodDetails = true;
  @Input() showTransactionStatus = true;
  // For showGood in showTransaction if showGoodDetails is true
  @Input() showGoodId = true;
  @Input() showName = true;
  @Input() showPrice = true;
  @Input() showSupply = true;
  @Input() showSeller = true;
  @Input() showMarket = true;

  // Whether to show the user the option to {pay, cancel} a good
  @Input() showOptionToPay = true;
  @Input() showOptionToCancel = true;


  @Input() showTransaction: Action = {
    type: <Type<Component>> ShowTransactionComponent
  };

  showCompoundTransaction;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory) {
    this.showCompoundTransaction = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.loadCompoundTransaction();
  }

  ngOnChanges() {
    this.loadCompoundTransaction();
  }

  loadCompoundTransaction() {
    // only load compound transaction when id is given
    if (!this.gs || !this.compoundTransaction || !this.compoundTransaction.id) {
      return;
    }
    this.gs.get<{data: {compoundTransaction: CompoundTransaction}}>('/graphql', {
      params: {
        query: `
          query {
            compoundTransaction(id: "${this.compoundTransaction.id}") {
              ${this.showId ? 'id' : ''}
              ${this.showTransactions ? 'transactions { id }' : ''}
              ${this.showTotalPrice ? 'totalPrice' : ''}
              ${this.showOptionToPay || this.showOptionToCancel 
                || this.showStatus ? 'status' : ''}
            }
          }
        `
      }
    })
    .subscribe((res) => {
      this.compoundTransaction = res.data.compoundTransaction;
    });
  }
}
