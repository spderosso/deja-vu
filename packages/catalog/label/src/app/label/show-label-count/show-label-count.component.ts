import {
  AfterViewInit, Component, ElementRef, Inject, Input, OnChanges,
  OnInit
} from '@angular/core';
import { DvService, DvServiceFactory, OnEval } from '@deja-vu/core';

import { API_PATH } from '../label.config';

import * as _ from 'lodash';

interface LabelCountRes {
  data: { labelCount: number };
}

@Component({
  selector: 'label-show-label-count',
  templateUrl: './show-label-count.component.html'
})
export class ShowLabelCountComponent
  implements AfterViewInit, OnChanges, OnEval, OnInit {
  labelCount: number;

  @Input() itemId: string | undefined;

  private dvs: DvService;

  constructor(
    private elem: ElementRef, private dvf: DvServiceFactory,
    @Inject(API_PATH) private apiPath) { }

  ngOnInit() {
    this.dvs = this.dvf.forComponent(this)
      .build();
  }

  ngAfterViewInit() {
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  load() {
    if (this.canEval()) {
      this.dvs.eval();
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      const res = await this.dvs.get<LabelCountRes>(this.apiPath, {
        params: {
          inputs: JSON.stringify({
            input: {
              itemId: this.itemId
            }
          })
        }
      });
      this.labelCount = res.data.labelCount;
    } else if (this.dvs) {
      this.dvs.noRequest();
    }
  }

  private canEval(): boolean {
    return !!(this.dvs);
  }
}
