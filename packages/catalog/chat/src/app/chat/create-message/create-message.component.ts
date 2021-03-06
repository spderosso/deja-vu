import {
  Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild
} from '@angular/core';
import {
  FormBuilder, FormControl, FormGroup, FormGroupDirective,
  NG_VALIDATORS, NG_VALUE_ACCESSOR, Validators
} from '@angular/forms';
import {
  DvService, DvServiceFactory, OnExec, OnExecFailure, OnExecSuccess
} from '@deja-vu/core';

import * as _ from 'lodash';

import { API_PATH } from '../chat.config';
import { GraphQlMessage, Message } from '../shared/chat.model';


interface CreateMessageRes {
  data: { createMessage: GraphQlMessage };
  errors: { message: string }[];
}

const SAVED_MSG_TIMEOUT = 3000;

@Component({
  selector: 'chat-create-message',
  templateUrl: './create-message.component.html',
  styleUrls: ['./create-message.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: CreateMessageComponent,
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: CreateMessageComponent,
      multi: true
    }
  ]
})
export class CreateMessageComponent
  implements OnInit, OnExec, OnExecFailure, OnExecSuccess {
  @Input() id: string | undefined;
  @Input() set content(inputContent: string) {
    this.contentControl.setValue(inputContent);
  }
  @Input() authorId: string;
  @Input() chatId: string;
  @Input() showOptionToSubmit = true;

  // Presentation inputs
  @Input() buttonLabel = 'Create Message';
  @Input() inputContentLabel = 'Content';
  @Input() newMessageSavedText = 'New message saved';
  @Input() showMessageSavedText = true;

  @ViewChild(FormGroupDirective) form;

  contentControl = new FormControl('', Validators.required);
  createMessageForm: FormGroup = this.builder.group({
    contentControl: this.contentControl
  });

  newMessageSaved = false;
  newMessageError: string;

  private dvs: DvService;

  constructor(
    private elem: ElementRef, private dvf: DvServiceFactory,
    private builder: FormBuilder, @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.dvs = this.dvf.forComponent(this)
      .build();
  }

  onSubmit() {
    this.dvs.exec();
  }

  async dvOnExec(): Promise<void> {
    if (!this.authorId || !this.chatId) {
      return this.dvs.noRequest();
    }
    const res = await this.dvs.post<CreateMessageRes>(this.apiPath, {
      inputs: {
        input: {
          id: this.id,
          content: this.contentControl.value,
          authorId: this.authorId,
          chatId: this.chatId
        }
      },
      extraInfo: { returnFields: 'id' }
    });

    if (res.errors) {
      throw new Error(_.map(res.errors, 'message')
        .join());
    }
  }

  dvOnExecSuccess() {
    this.newMessageSaved = true;
    window.setTimeout(() => {
      this.newMessageSaved = false;
    }, SAVED_MSG_TIMEOUT);
    // Can't do `this.form.reset();`
    // See https://github.com/angular/material2/issues/4190
    if (this.form) {
      this.form.resetForm();
    }
  }

  dvOnExecFailure(reason: Error) {
    this.newMessageError = reason.message;
  }
}
