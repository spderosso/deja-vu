import { Component, ElementRef, Inject, Input } from '@angular/core';

import { GatewayService, GatewayServiceFactory } from 'dv-core';

import { API_PATH } from '../market.config';
import { Party } from '../shared/market.model';

interface PartyRes {
  data: { party: Party },
  errors: { message: string }[]
}

@Component({
  selector: 'market-show-party',
  templateUrl: './show-party.component.html',
  styleUrls: ['./show-party.component.css'],
})
export class ShowPartyComponent {
  @Input() party: Party;
  @Input() id: string;

  @Input() showId = true;
  @Input() showBalance = true;

  @Input() noBalanceText = 'No balance';


  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.loadParty();
  }

  ngOnChanges() {
    this.loadParty();
  }

  loadParty() {
    // only load party when id is given
    if (!this.gs || this.party || !this.id) {
      return;
    }
    this.gs.get<PartyRes>(this.apiPath, {
      params: {
        query: `
          query {
            party(id: "${this.id}") {
              ${this.showId ? 'id' : ''}
              ${this.showBalance ? 'balance' : ''}
            }
          }
        `
      }
    })
    .subscribe((res) => {
      this.party = res.data.party;
    })
  }
}