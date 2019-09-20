import {
  AfterViewInit, Component, ElementRef, Inject, Input, OnChanges, OnInit, Type
} from '@angular/core';
import {
  ComponentValue, ConfigServiceFactory, GatewayService, GatewayServiceFactory,
  OnEval, RunService, WaiterService, WaiterServiceFactory
} from '@deja-vu/core';

import { Transfer } from '../shared/transfer.model';
import {
  ShowTransferComponent
} from '../show-transfer/show-transfer.component';
import { API_PATH } from '../transfer.config';


@Component({
  selector: 'transfer-show-transfers',
  templateUrl: './show-transfers.component.html',
  styleUrls: ['./show-transfers.component.css']
})
export class ShowTransfersComponent
  implements AfterViewInit, OnEval, OnInit, OnChanges {
  @Input() waitOn: string[];
  // Fetch rules
  // If undefined then the fetched transfers are not filtered by that property
  @Input() fromId: string | undefined;
  @Input() toId: string | undefined;

  // Show rules
  /* What fields of the transfer to show. These are passed as input
     to `showTransfer` */
  @Input() showId = true;
  @Input() showFromId = true;
  @Input() showToId = true;
  @Input() showAmount = true;

  @Input() showTransfer: ComponentValue = {
    type: <Type<Component>> ShowTransferComponent
  };
  @Input() noTransfersToShowText = 'No transfers to show';
  transfers: Transfer[] = [];

  balanceType: 'money' | 'items';

  showTransfers;
  private ws: WaiterService;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, private csf: ConfigServiceFactory,
    private wsf: WaiterServiceFactory,
    @Inject(API_PATH) private apiPath) {
    this.showTransfers = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    this.ws = this.wsf.for(this, this.waitOn);

    this.balanceType = this.csf.createConfigService(this.elem)
      .getConfig().balanceType;
  }

  ngAfterViewInit() {
    this.fetchTransfers();
  }

  ngOnChanges() {
    this.fetchTransfers();
  }

  fetchTransfers() {
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      await this.ws.maybeWait();
      const selection = this.balanceType === 'money' ?
        '' : ' { id, count }';
      this.gs
        .get<{data: {transfers: Transfer[]}}>(this.apiPath, {
          params: {
            // When we are sending a potentially empty input object we need to
            // stringify the variables
            inputs: JSON.stringify({
              input: {
                fromId: this.fromId,
                toId: this.toId
              }
            }),
            extraInfo: {
              returnFields: `
                ${this.showId ? 'id' : ''}
                ${this.showFromId ? 'fromId' : ''}
                ${this.showToId ? 'toId' : ''}
                ${this.showAmount ? `amount ${selection}` : ''}
              `
            }
          }
        })
        .subscribe((res) => {
          this.transfers = res.data.transfers;
        });
    } else if (this.gs) {
      this.gs.noRequest();
    }
  }

  private canEval(): boolean {
    return !!(this.gs);
  }
}
