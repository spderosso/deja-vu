import {
  AfterViewInit, Component, ElementRef, Inject, Input, OnInit, OnChanges, Type
} from '@angular/core';

import {
  ComponentValue, GatewayService, GatewayServiceFactory, OnEval, RunService
} from '@deja-vu/core';

import { ShowTargetComponent } from '../show-target/show-target.component';

import { API_PATH } from '../ranking.config';
import { TargetRank } from '../shared/ranking.model';


@Component({
  selector: 'ranking-show-fractional-ranking',
  templateUrl: './show-fractional-ranking.component.html',
  styleUrls: ['./show-fractional-ranking.component.css']
})
export class ShowFractionalRankingComponent
implements AfterViewInit, OnEval, OnInit, OnChanges {
  @Input() targetIds: string[];

  @Input() showTargetId = true;
  @Input() showTargetRank = true;

  @Input() targetRankLabel = 'Rank: ';
  @Input() noTargetsText = 'No targets';

  @Input() showTarget: ComponentValue = {
    type: <Type<Component>> ShowTargetComponent
  };

  targets: TargetRank[];
  showTargetRankings;

  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, @Inject(API_PATH) private apiPath) {
    this.showTargetRankings = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  ngAfterViewInit() {
    this.loadTargetRankings();
  }

  ngOnChanges() {
    this.loadTargetRankings();
  }

  loadTargetRankings() {
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs.get<{data: {fractionalRanking: TargetRank[]}}>(this.apiPath, {
        params: {
          inputs: {
            targetIds: this.targetIds
          },
          extraInfo: {
            returnFields: `
              ${this.showTargetId ? 'id' : ''}
              ${this.showTargetRank ? 'rank' : ''}
            `
          }
        }
      })
      .subscribe((res) => {
        this.targets = res.data.fractionalRanking;
      });
    } else if (this.gs) {
      this.gs.noRequest();
    }
  }

  private canEval(): boolean {
    return !!(this.gs && this.targetIds);
  }
}
