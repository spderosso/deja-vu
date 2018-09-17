import {
  Component, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit,
  SimpleChanges, Type
} from '@angular/core';
import { Action, GatewayService, GatewayServiceFactory } from 'dv-core';

import { filter, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { API_PATH } from '../label.config';

import { ShowItemComponent } from '../show-item/show-item.component';

interface ItemsRes {
  data: { items: string[] };
  errors: { message: string }[];
}

@Component({
  selector: 'label-show-items',
  templateUrl: './show-items.component.html',
  styleUrls: ['./show-items.component.css']
})
export class ShowItemsComponent implements OnInit, OnChanges {
  // A list of itemIds to wait for
  @Input() waitOn: string[] = [];
  // Watcher of changes to fields specified in `waitOn`
  // Emits the field name that changes
  fieldChange = new EventEmitter<string>();

  @Input() showItem: Action = {
    type: <Type<Component>>ShowItemComponent
  };

  @Input() noItemsToShowText = 'No items to show';

  itemIds: string[] = [];

  showItems;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    @Inject(API_PATH) private apiPath) {
    this.showItems = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.loadItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const field of this.waitOn) {
      if (changes[field]) {
        this.fieldChange.emit(field);
      }
    }
    this.loadItems();
  }

  async loadItems() {
    if (this.gs) {
      await Promise.all(_.chain(this.waitOn)
        .filter((field) => !this[field])
        .map((fieldToWaitFor) => this.fieldChange
          .pipe(filter((field) => field === fieldToWaitFor), take(1))
          .toPromise())
        .value());

      this.gs
        .get<ItemsRes>(this.apiPath, {
          params: {
            query: `
                query {
                  items(input: { })
                }
              `
          }
        })
        .subscribe((res) => {
          this.itemIds = res.data.items;
        });
    }
  }
}