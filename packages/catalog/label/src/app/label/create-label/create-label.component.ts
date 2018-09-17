import {
  Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output
} from '@angular/core';

import {
  GatewayService, GatewayServiceFactory, OnAfterAbort, OnAfterCommit,
  OnRun, RunService
} from 'dv-core';

import * as _ from 'lodash';

import { API_PATH } from '../label.config';
import { Label } from '../shared/label.model';

interface CreateLabelRes {
  data: { createLabel: Label };
  errors: { message: string }[];
}

const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'label-create-label',
  templateUrl: './create-label.component.html',
  styleUrls: ['./create-label.component.css']
})
export class CreateLabelComponent implements
  OnInit, OnRun, OnAfterAbort, OnAfterCommit {
  @Input() id: string | undefined;
  @Input() buttonLabel = 'Create Label';

  @Input() showOptionToSubmit = true;

  // Presentation inputs
  @Input() inputLabel = 'Label Id';
  @Input() newLabelSavedText = 'New label saved';

  @Output() label: EventEmitter<Label> = new EventEmitter<Label>();

  newLabelSaved = false;
  newLabelError: string;

  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, @Inject(API_PATH) private apiPath) { }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  onSubmit() {
    this.rs.run(this.elem);
  }

  async dvOnRun(): Promise<void> {
    const res = await this.gs.post<CreateLabelRes>(this.apiPath, {
      query: `mutation {
          createLabel(id: "${this.id}") {
            id
          }
        }`
    })
      .toPromise();

    if (res.errors) {
      throw new Error(_.map(res.errors, 'message')
        .join());
    }

    this.label.emit(res.data.createLabel);
  }

  dvOnAfterCommit() {
    this.newLabelSaved = true;
    this.newLabelError = '';
    window.setTimeout(() => {
      this.newLabelSaved = false;
    }, SAVED_MSG_TIMEOUT);
    this.id = '';
  }

  dvOnAfterAbort(reason: Error) {
    this.newLabelError = reason.message;
  }
}