import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output,
  ViewChild
} from '@angular/core';
import {
  AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective,
  Validators
} from '@angular/forms';
import {
  DvService, DvServiceFactory, OnExec, OnExecFailure, OnExecSuccess
} from '@deja-vu/core';

import * as _ from 'lodash';

import { Event, fromUnixTime, toUnixTime } from '../../../../shared/data';
import { endTimeValidator } from '../shared/time.validator';


const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'event-update-event',
  templateUrl: './update-event.component.html'
})
export class UpdateEventComponent
  implements OnExec, OnExecSuccess, OnExecFailure, OnInit {
  @Input() id: string;
  @Input() showOptionToSubmit = true;

  // Presentation inputs
  @Input() buttonLabel = 'Update Event';
  @Input() updateEventSavedText = 'Event updated';

  @ViewChild(FormGroupDirective) form;

  startsOnControl = new FormControl('', [Validators.required]);
  endsOnControl = new FormControl('', [Validators.required]);
  startTimeControl = new FormControl('', [Validators.required]);
  endTimeControl = new FormControl('', [
    Validators.required,
    endTimeValidator(() => this.startTimeControl.value)
  ]);

  updateEventForm: FormGroup = this.builder.group({
    startsOn: this.startsOnControl,
    endsOn: this.endsOnControl,
    startTime: this.startTimeControl,
    endTime: this.endTimeControl
  });

  updateEventSaved = false;
  updateEventError: string;

  private dvs: DvService;

  constructor(
    private readonly elem: ElementRef, private readonly dvf: DvServiceFactory,
    private readonly builder: FormBuilder) {}

  ngOnInit() {
    this.dvs = this.dvf.forComponent(this)
      .build();
  }

  onSubmit() {
    this.dvs.exec();
  }

  async dvOnExec(): Promise<void> {
    const res = await this.dvs.post<{data: any}>('/graphql', {
      inputs: {
        input: {
          id: this.id,
          startDate: toUnixTime(
            this.startsOnControl.value, this.startTimeControl.value),
          endDate: toUnixTime(
            this.endsOnControl.value, this.endTimeControl.value)
        }
      },
      extraInfo: { returnFields: ''}
    });
  }

  setInitialValues(value) {
    this.startsOnControl.setValue(value.startDate);
    this.startTimeControl.setValue(value.startDate.format('HH:mm'));
    this.endsOnControl.setValue(value.endDate);
    this.endTimeControl.setValue(value.endDate.format('HH:mm'));
  }

  dvOnExecSuccess() {
    if (this.showOptionToSubmit) {
      this.updateEventSaved = true;
      window.setTimeout(() => {
        this.updateEventSaved = false;
      }, SAVED_MSG_TIMEOUT);
    }
  }

  dvOnExecFailure(reason: Error) {
    if (this.showOptionToSubmit) {
      this.updateEventError = reason.message;
    }
  }
}
