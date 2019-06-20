import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnChanges,
  OnInit, Output, Type
} from '@angular/core';
import {
  ConfigService, ConfigServiceFactory, GatewayService,
  GatewayServiceFactory, OnEval, RunService
} from '@deja-vu/core';

import { API_PATH } from '../rating.config';
import { DEFAULT_RATING_FILTER } from '../shared/rating.model';


/**yarn
 * Filter out ratings in a list of ratings that are
 * larger than (or equal to) certain number
 */
@Component({
  selector: 'rating-filter-ratings',
  templateUrl: './filter-ratings.component.html',
  styleUrls: ['./filter-ratings.component.css']
})
export class FilterRatingsComponent implements AfterViewInit, OnEval, OnInit
  {
  /**
   * A list of choices of minimumRatings that the user can filter with
   * Example:
   *  if minimumRatings = [ 2, 3, 4.5 ]
   *  then the html displayed will be:
   *    [ ] 2 & up
   *    [x] 3 & up
   *    [ ] 4.5 & up
   */
  @Input() minimumRatings = DEFAULT_RATING_FILTER;
  selectedMinimumRating: number;

  /**
   * The ratings left after filtering
   */
  @Output() loadedRatings = new EventEmitter<any>();
  _loadedRatings: Object[] = [];

  private gs: GatewayService;
  private cs: ConfigService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, private csf: ConfigServiceFactory,
    @Inject(API_PATH) private apiPath) {
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
    this.cs = this.csf.createConfigService(this.elem);
  }

  ngAfterViewInit() {
    this.load();
  }

  async load() {
    if (!this.gs) {
      return;
    }
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs
        .get<{data: {objects: Object[]}}>(this.apiPath, {
          params: {
            inputs: {
              input: {
                minimumRating: this.selectedMinimumRating
              }
            },
            extraInfo: {
              action: 'filter-ratings',
              returnFields: `
                sourceId
                targetId
                rating
              `
            }
          }
        })
        .subscribe((res) => {
          this._loadedRatings = res.data.objects;
          this.loadedRatings.emit(this._loadedRatings);
        });
    } else if (this.gs) {
      this.gs.noRequest();
    }
  }

  updateSelected(newSelectedMinimumRating) {
    this.selectedMinimumRating = newSelectedMinimumRating;
    this.load();
  }

  private canEval(): boolean {
    return !!(this.gs);
  }
}
