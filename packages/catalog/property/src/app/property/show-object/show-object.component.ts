import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnChanges,
  OnInit, Output, Type
} from '@angular/core';
import {
  Action, ConfigService, ConfigServiceFactory, GatewayService,
  GatewayServiceFactory, OnEval, RunService
} from '@deja-vu/core';
import * as _ from 'lodash';

import { getFilteredPropertyNames } from '../shared/property.model';

import { ShowUrlComponent } from '../show-url/show-url.component';

import { API_PATH } from '../property.config';

/**
 * Displays an object
 */
@Component({
  selector: 'property-show-object',
  templateUrl: './show-object.component.html',
  styleUrls: ['./show-object.component.css']
})
export class ShowObjectComponent implements AfterViewInit, OnEval, OnInit,
OnChanges {
  /**
   * Action to use to show URL properties
   */
  @Input() showUrl: Action = {
    type: <Type<Component>> ShowUrlComponent
  };
  /**
   * The ID of the object to show
   */
  @Input() id: string;
  /**
   * The actual data of the object to show. Can be given instead of ID to avoid
   * needing to retrieve object data from the database that you already have
   */
  @Input() object: any;
  /**
   * List of property names.
   * If given, causes only these properties to be shown.
   */
  @Input() showOnly: string[];
  /**
   * List of property names.
   * If given, causes these properties to not be shown.
   */
  @Input() showExclude: string[];
  /**
   * Passed to showUrl
   * (For the default showUrl, this will cause any URL properties
   * to display without the protocol and path)
   */
  @Input() showBaseUrlsOnly: boolean = false;
  /**
   * The object being shown
   */
  @Output() loadedObject = new EventEmitter<any>();

  /**
   * List of property names.
   * If given, causes exactly these properties to be shown.
   * Takes precedence over showOnly and showExclude.
   * Primarily intended for use within the cliché.
   * App creators probably want showOnly.
   */
  @Input() properties: string[];
  private urlProps: Set<string> = new Set();

  showObject;
  private gs: GatewayService;
  private cs: ConfigService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, private csf: ConfigServiceFactory,
    @Inject(API_PATH) private apiPath) {
    this.showObject = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    this.cs = this.csf.createConfigService(this.elem);

    this.properties = getFilteredPropertyNames(
      this.showOnly, this.showExclude, this.cs);

    const schema = this.cs.getConfig()['schema'];
    this.urlProps = new Set([ ..._
      .chain(schema.properties)
      .pickBy((p) => p.type === 'string' && p.format === 'url')
      .keys()
      .value()
    ]);
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
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs
        .get<{data: {object: Object}}>(this.apiPath, {
          params: {
            inputs: { id: this.id },
            extraInfo: {
              action: 'object',
              returnFields: `
                id
                ${this.properties.join('\n')}
              `
            }
          }
        })
        .subscribe((res) => {
          this.object = res.data.object;
          this.loadedObject.emit(this.object);
        });
    } else if (this.gs) {
      this.gs.noRequest();
    }
  }

  isUrl(propName: string): boolean {
    return this.urlProps.has(propName);
  }

  private canEval(): boolean {
    return !!(!this.object && this.id && this.gs);
  }
}
