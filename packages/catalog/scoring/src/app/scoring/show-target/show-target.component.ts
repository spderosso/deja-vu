import {
  AfterViewInit, Component, ElementRef, Inject, Input, OnInit, OnChanges, Type
} from '@angular/core';

import {
  Action, GatewayService, GatewayServiceFactory, OnEval, RunService
} from 'dv-core';

import { ShowScoreComponent } from '../show-score/show-score.component';

import { API_PATH } from '../scoring.config';
import { Target } from '../shared/scoring.model';


@Component({
  selector: 'scoring-show-target',
  templateUrl: './show-target.component.html',
  styleUrls: ['./show-target.component.css']
})
export class ShowTargetComponent implements AfterViewInit, OnEval, OnInit,
OnChanges {
  @Input() id: string;
  @Input() target: Target;

  @Input() showId = true;
  @Input() showScores = true;
  @Input() showTotal = true;
  @Input() showScoreId = true;
  @Input() showScoreValue = true;
  @Input() showScoreTargetId = true;

  @Input() totalLabel = 'Total: ';
  @Input() noScoresText = 'No scores to show';

  @Input() showScore: Action = {
    type: <Type<Component>> ShowScoreComponent
  };

  showTarget;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, @Inject(API_PATH) private apiPath) {
    this.showTarget = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  ngAfterViewInit() {
    this.loadTarget();
  }

  ngOnChanges() {
    this.loadTarget();
  }

  loadTarget() {
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs.get<{data: {target: Target}}>(this.apiPath, {
        params: {
          query: `
            query {
              target(id: "${this.id}") {
                id
                ${this.showScores ? 'scores ' +
                  '{' +
                    'id \n' +
                    `${this.showScoreValue ? 'value' : ''} \n` +
                    `${this.showScoreTargetId ? 'targetId' : ''}` : ''
                  }
                }
                ${this.showTotal ? 'total': ''}
              }
            }
          `
        }
      })
      .subscribe((res) => {
        this.target = res.data.target;
      });
    }
  }

  private canEval(): boolean {
    return !!(this.gs && this.id && !this.target);
  }
}
