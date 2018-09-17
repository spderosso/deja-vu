import {
  Component, ElementRef, EventEmitter, Inject, Input, OnInit
} from '@angular/core';

import {
  GatewayService, GatewayServiceFactory, OnRun, RunService
} from 'dv-core';

import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

import { Property } from '../shared/property.model';

import * as _ from 'lodash';

import { API_PATH } from '../property.config';


const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'property-create-objects',
  templateUrl: './create-objects.component.html',
  styleUrls: ['./create-objects.component.css']
})
export class CreateObjectsComponent implements OnInit, OnRun {
  @Input() objects: any[];

  private gs: GatewayService;
  private properties: string[];

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService,
    @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    this.loadSchema();
  }

  loadSchema() {
    if (!this.gs) {
      return;
    }
    this.gs
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
      .pipe(map((res) => res.data.properties))
      .subscribe((properties: Property[]) => {
        this.properties = _.map(properties, 'name');
      });
  }

  async dvOnRun(): Promise<void> {
    if (_.isEmpty(this.objects)) {
      return;
    }
    const res = await this.gs
      .post<{data: any, errors: {message: string}[]}>(this.apiPath, {
        query: `mutation CreateObjects($input: [CreateObjectInput!]!) {
          createObjects(input: $input) {
            id
          }
        }`,
        variables: {
          input: _.map(this.objects, this.objectToCreateObjectInput.bind(this))
        }
      })
      .toPromise();
    if (res.errors) {
      throw new Error(_.map(res.errors, 'message')
        .join());
    }
  }

  objectToCreateObjectInput(obj: any) {
    return _.pick(obj, ['id', ...this.properties]);
  }
}