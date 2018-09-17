import {
  Component, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit, Output,
  SimpleChanges, ViewChild
} from '@angular/core';
import {
  AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective,
  Validators
} from '@angular/forms';

import {
  GatewayService, GatewayServiceFactory, OnRun, RunService
} from 'dv-core';

import { Observable } from 'rxjs/Observable';
import { map, take } from 'rxjs/operators';

import { API_PATH } from '../allocator.config';


interface ConsumerOfResourceRes {
  data: { consumerOfResource: string };
}

interface EditConsumerOfResourceRes {
  data: { editConsumerOfResource: boolean };
}

const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'allocator-edit-consumer',
  templateUrl: './edit-consumer.component.html',
  styleUrls: ['./edit-consumer.component.css']
})
export class EditConsumerComponent implements OnChanges, OnInit, OnRun {
  @Input() resourceId: string;
  @Input() allocationId: string;
  @Input() buttonLabel = 'Save';
  @Input() inputLabel = 'Id';

  @ViewChild(FormGroupDirective) form;

  newConsumerControl = new FormControl('', [
    Validators.required,
    (control: AbstractControl): {[key: string]: any} => {
      if (!this._currentConsumerId ||
        control.value === this._currentConsumerId) {
        return { noChange: this._currentConsumerId  };
      }

      return null;
    }
  ]);
  editConsumerForm: FormGroup = this.builder.group({
    newConsumerControl: this.newConsumerControl
  });

  @Input() set newConsumerId(id: string) {
    this.newConsumerControl.setValue(id);
  }
  @Output() currentConsumerId = new EventEmitter();
  _currentConsumerId: string;

  editConsumerSavedText = 'Saved';
  editConsumerSaved = false;
  editConsumerError: string;

  private gs: GatewayService;

  constructor(
    private elem: ElementRef,
    private gsf: GatewayServiceFactory,
    private rs: RunService, private builder: FormBuilder,
    @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    this.update();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.resourceId || changes.allocationId) {
      this.update();
    }
  }

  update() {
    if (this.gs && this.resourceId && this.allocationId) {
      this.gs.get<ConsumerOfResourceRes>(this.apiPath, {
        params: {
          query: `
            query ConsumerOfResource($input: ConsumerOfResourceInput!) {
              consumerOfResource(input: $input)
            }
          `,
          variables: JSON.stringify({
            input: {
              resourceId: this.resourceId,
              allocationId: this.allocationId
            }
          })
        }
      })
      .pipe(map((res) => res.data.consumerOfResource))
      .subscribe((consumerId) => {
        this.currentConsumerId.emit(consumerId);
        this._currentConsumerId = consumerId;
        this.newConsumerControl.setValue(consumerId);
      });
    }
  }

  onSubmit() {
    this.rs.run(this.elem);
  }

  async dvOnRun() {
    if (this.newConsumerControl.value === this._currentConsumerId) {
      return;
    }
    const newConsumerId = this.newConsumerControl.value;
    const res = await this.gs.post<EditConsumerOfResourceRes>(this.apiPath, {
      query: `
        mutation EditConsumerOfResource(
          $input: EditConsumerOfResourceInput!) {
          editConsumerOfResource(input: $input)
        }
      `,
      variables: {
        input: {
          resourceId: this.resourceId,
          allocationId: this.allocationId,
          newConsumerId: newConsumerId
        }
      }
    })
    .toPromise();
    if (res.data.editConsumerOfResource) {
      this._currentConsumerId = newConsumerId;
    }
  }

  dvOnAfterCommit() {
    this.editConsumerSaved = true;
    window.setTimeout(() => {
      this.editConsumerSaved = false;
    }, SAVED_MSG_TIMEOUT);

    // https://github.com/angular/material2/issues/4190
    if (this.form) {
      this.form.resetForm();
      this.newConsumerControl.setValue(this._currentConsumerId);
    }
  }

  dvOnAfterAbort(reason: Error) {
    this.editConsumerError = reason.message;
  }
}