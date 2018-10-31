import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnChanges,
  OnInit, Output, Type
} from '@angular/core';
import {
  Action,
  GatewayService,
  GatewayServiceFactory,
  OnEval,
  RunService
} from 'dv-core';
import * as _ from 'lodash';

import { properties, Property } from '../shared/property.model';

import { API_PATH } from '../property.config';


@Component({
  selector: 'property-show-object',
  templateUrl: './show-object.component.html',
  styleUrls: ['./show-object.component.css']
})
export class ShowObjectComponent implements AfterViewInit, OnEval, OnInit,
OnChanges {
  @Input() id: string;
  @Input() object: any;
  @Input() showOnly: string[];
  @Input() showExclude: string[];
  @Output() loadedObject = new EventEmitter<any>();

  // Internal input
  @Input() properties: string[];

  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  ngAfterViewInit() {
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  async load() {
    if (!this.gs) {
      return;
    }
    if (!this.properties) {
      this.properties = await properties(
        this.showOnly, this.showExclude, this.fetchProperties.bind(this));
    }
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs
        .get<{data: {object: Object}}>(this.apiPath, {
          params: {
            query: `
              query {
                object(id: "${this.id}") {
                  ${this.properties.join('\n')}
                }
              }
            `
          }
        })
        .subscribe((res) => {
          this.object = res.data.object;
          this.loadedObject.emit(this.object);
        });
    }
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

  private canEval(): boolean {
    return !!(!this.object && this.id && this.properties && this.gs);
  }
}
