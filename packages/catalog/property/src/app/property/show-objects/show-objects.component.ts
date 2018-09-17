import {
  Component, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit, Output,
  Type
} from '@angular/core';
import { Action, GatewayService, GatewayServiceFactory } from 'dv-core';
import * as _ from 'lodash';

import { properties, Property } from '../shared/property.model';

import { ShowObjectComponent } from '../show-object/show-object.component';

import { API_PATH } from '../property.config';


@Component({
  selector: 'property-show-objects',
  templateUrl: './show-objects.component.html',
  styleUrls: ['./show-objects.component.css']
})
export class ShowObjectsComponent implements OnInit, OnChanges {
  @Input() showObject: Action = {
    type: <Type<Component>> ShowObjectComponent
  };
  _objects: Object[] = [];
  @Input() showOnly: string[];
  @Input() showExclude: string[];
  @Output() objects = new EventEmitter<Object[]>();
  @Output() objectIds = new EventEmitter<string[]>();

  properties: string[];
  showObjects;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    @Inject(API_PATH) private apiPath) {
    this.showObjects = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  async load() {
    if (!this.gs) {
      return;
    }
    this.properties = await properties(
      this.showOnly, this.showExclude, this.fetchProperties.bind(this));
    this.fetchObjects();
  }

  async fetchProperties(): Promise<string[]> {
    const res = await this.gs
      .get<{data: {properties: Property[]}}>(this.apiPath, {
        params: {
          query: `
            query {
              properties {
                name
              }
            }
          `
        }
      })
      .toPromise();

    return _.map(res.data.properties, 'name');
  }

  fetchObjects() {
    if (this.gs) {
      this.gs
        .get<{data: {objects: Object[]}}>(this.apiPath, {
          params: {
            query: `
              query {
                objects {
                  id
                  ${_.map(this.properties)
                      .join('\n')}
                }
              }
            `
          }
        })
        .subscribe((res) => {
          this._objects = res.data.objects;
          this.objects.emit(this._objects);
          this.objectIds.emit(_.map(this._objects, 'id'));
        });
    }
  }
}