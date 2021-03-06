import { Component, ElementRef, Input, OnInit } from '@angular/core';

import {
  DvService, DvServiceFactory, OnExec, OnExecSuccess
} from '@deja-vu/core';


@Component({
  selector: 'task-complete-task',
  templateUrl: './complete-task.component.html',
  styleUrls: ['./complete-task.component.css']
})
export class CompleteTaskComponent
  implements OnInit, OnExec, OnExecSuccess  {
  @Input() id;
  @Input() disabled = false;

  private dvs: DvService;

  constructor(
    private readonly elem: ElementRef,
    private readonly dvf: DvServiceFactory) {}

  ngOnInit() {
    this.dvs = this.dvf.forComponent(this)
      .build();
  }

  onClick() {
    this.dvs.exec();
  }

  dvOnExec(): Promise<{data: any}> {
    return this.dvs.post<{data: any}>('/graphql', {
      inputs: { id: this.id }
    });
  }

  dvOnExecSuccess() {
    this.disabled = true;
  }
}
