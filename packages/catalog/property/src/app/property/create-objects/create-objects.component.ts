import {
  Component, ElementRef, EventEmitter, Inject, Input,
  OnChanges, OnInit, QueryList, ViewChildren
} from '@angular/core';

import { DvService, DvServiceFactory, OnExec } from '@deja-vu/core';

import {
  CreateObjectComponent
} from '../create-object/create-object.component';

import * as _ from 'lodash';

import {
  getObjectTitleFromConfig, getPropertyNamesFromConfig
} from '../shared/property.model';

import { API_PATH } from '../property.config';

/**
 * Create objects in bulk
 * There are two ways to use this component:
 *  1. if `objects` is inputted:
 *      the component will not display anything.
 *      the data for the objects must come from another component.
 *      the component's execution must be triggered by another component (in a
 *      transaction)
 *  2. if `objects` is not inputted:
 *      the component works similar to when multiple `create-object` components
 *      are stacked.
 *      there must be a list of `ids` for the objects that will be created.
 */
@Component({
  selector: 'property-create-objects',
  templateUrl: './create-objects.component.html',
  styleUrls: ['./create-objects.component.css']
})
export class CreateObjectsComponent implements OnInit, OnChanges, OnExec {
  /**
   * List of objects to save to the database as new entities
   */
  @Input() objects: any[];

  /**
   * List of Id of the new objects to create
   * Note that it is NOT wired to the objects input
   */
  @Input() ids: string[];

  /**
   * A list of initialValue that will be mapped to each of
   * the ids separately. They can be seen as partial objects
   * that serve as templates for the newly created objects.
   */
  @Input() initialValues: any[];

  /**
   * A key-value pair that overrides the initial values of all objects
   */
  @Input() initialValue: any;

  /**
   * List of property names to no show input fields for
   */
  @Input() showExclude: string[] = [];

  /**
   * The label that shows on the button that triggers
   * the object creation
   */
  @Input() buttonLabel;

  /**
   * Only used when there is no objects
   */
  @Input() showOptionToSubmit = true;

  @ViewChildren(CreateObjectComponent) createObjectComponents:
    QueryList<CreateObjectComponent>;

  private dvs: DvService;
  private properties: string[];
  config;
  mergedInitialValues = [];
  showInputForms = false;

  constructor(
    private elem: ElementRef, private dvf: DvServiceFactory,
    @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.dvs = this.dvf.forComponent(this)
      .build();
    this.config = this.dvs.config.getConfig();

    if (this.buttonLabel === undefined) {
      const objTitle = getObjectTitleFromConfig(this.config);
      this.buttonLabel = `Create ${objTitle}s`;
    }
    this.properties = getPropertyNamesFromConfig(this.config);
  }

  ngOnChanges() {
    if (this.objects) {
      return;
    }
    if (!this.ids) {
      return;
    }

    this.showInputForms = true;

    this.objects = [];
    for (const index of Object.keys(this.ids)) {
      if (this.initialValues &&
        this.initialValues[index] &&
        this.initialValue) {
        this.mergedInitialValues[index] = {
          ...this.initialValues[index],
          ...this.initialValue
        };
      } else {
        this.mergedInitialValues[index] = this.initialValue;
      }
      this.objects.push({});
    }
  }

  async dvOnExec(): Promise<void> {
    const res = await this.dvs
      .post<{data: any, errors: {message: string}[]}>(this.apiPath, {
        inputs: {
          input: _.map(this.objects, this.objectToCreateObjectInput.bind(this))
        },
        extraInfo: {
          action: 'create',
          returnFields: 'id'
        }
      });
    if (res.errors) {
      throw new Error(_.map(res.errors, 'message')
        .join());
    }
    this.createObjectComponents.forEach((child) => {
      child.reset();
    });
  }

  objectToCreateObjectInput(obj: any) {
    return _.pick(obj, ['id', ...this.properties]);
  }

  submit() {
    this.dvs.exec();
  }

  updateIndexedObject(object, index) {
    this.objects[index] = object;
  }
}
