import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output,
  ViewChild
} from '@angular/core';
import {
  AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective,
  Validators
} from '@angular/forms';
import {
  GatewayService, GatewayServiceFactory, OnAfterAbort, OnAfterCommit, OnRun,
  RunService
} from 'dv-core';

import * as _ from 'lodash';

import * as moment from 'moment';

import { Event, fromUnixTime, toUnixTime } from '../../../../shared/data';
import { endTimeValidator } from '../shared/time.validator';


const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'event-create-weekly-series',
  templateUrl: './create-weekly-series.component.html',
  styleUrls: ['./create-weekly-series.component.css']
})
export class CreateWeeklySeriesComponent
implements OnInit, OnRun, OnAfterCommit, OnAfterAbort {
  @Input() id: string | undefined = '';
  @Input() showOptionToSubmit = true;
  @Input() save = true;
  @Output() seriesEvents = new EventEmitter<Event[]>();
  _seriesEvents: Event[] = [];

  // Presentation inputs
  @Input() buttonLabel = 'Create Weekly Event';
  @Input() createWeeklySeriesSavedText = 'New weekly event saved';

  @ViewChild(FormGroupDirective) form;

  startsOn = new FormControl('', [Validators.required]);
  endsOn = new FormControl('', [Validators.required]);
  startTime = new FormControl('', [Validators.required]);
  endTime = new FormControl('', [
    Validators.required, endTimeValidator(() => this.startTime.value)
  ]);

  createWeeklySeriesForm: FormGroup = this.builder.group({
    startsOn: this.startsOn,
    endsOn: this.endsOn,
    startTime: this.startTime,
    endTime: this.endTime
  });

  createWeeklySeriesSaved = false;
  createWeeklySeriesError: string;

  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, private builder: FormBuilder) {}

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    this.createWeeklySeriesForm
      .statusChanges
      .subscribe((st: 'VALID' | 'INVALID') => {
        if (st === 'VALID') {
          this._seriesEvents = this.getSeriesEvents();
          this.seriesEvents.emit(this._seriesEvents);
        }
      });
  }

  onSubmit() {
    this.rs.run(this.elem);
  }

  dvOnRun(): Promise<any> {
    if (this.save) {
      return this.gs
        .post<{data: any}>('/graphql', {
          query: `mutation CreateSeries($input: CreateSeriesInput!) {
            createSeries(input: $input) {
              id
            }
          }`,
          variables: {
            input: {
              id: this.id ? this.id : '',
              events: this._seriesEvents
            }
          }
        })
        .toPromise();
    }
  }

  dvOnAfterCommit() {
    if (this.save) {
      this.createWeeklySeriesSaved = true;
      window.setTimeout(() => {
        this.createWeeklySeriesSaved = false;
      }, SAVED_MSG_TIMEOUT);
      // Can't do `this.createWeeklySeriesForm.reset();`
      // See https://github.com/angular/material2/issues/4190
    }
    if (this.form) {
      this.form.resetForm();
    }
  }

  dvOnAfterAbort(reason: Error) {
    if (this.save) {
      this.createWeeklySeriesError = reason.message;
    }
  }

  getSeriesEvents(): Event[] {
    const startsOnDate: moment.Moment = this.startsOn.value;
    const endsOnDate: moment.Moment = this.endsOn.value;

    const events = [];
    for (
      const eventDate = startsOnDate.clone(); eventDate <= endsOnDate;
      eventDate.add(1, 'w')) {

      const e = {
        startDate: toUnixTime(eventDate, this.startTime.value),
        endDate: toUnixTime(eventDate, this.endTime.value),
        seriesId: this.id
      };
      events.push(e);
    }

    return events;
  }
}
