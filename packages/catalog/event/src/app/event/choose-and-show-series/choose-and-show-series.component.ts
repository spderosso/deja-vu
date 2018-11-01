import { DatePipe } from '@angular/common';
import { Component, ElementRef, Input, OnInit, Type } from '@angular/core';
import { Action, GatewayService, GatewayServiceFactory } from 'dv-core';
import * as _ from 'lodash';

import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';

import {
  Event, GraphQlEvent, toEvent, Series, toSeries, GraphQlSeries
} from '../../../../shared/data';

import { ShowEventComponent } from '../show-event/show-event.component';


interface SeriesRes {
  data: { series: GraphQlSeries[] };
}

interface OneSeriesRes {
  data: {
    oneSeries: { events: GraphQlEvent[] }
  };
}


@Component({
  selector: 'event-choose-and-show-series',
  templateUrl: './choose-and-show-series.component.html',
  styleUrls: ['./choose-and-show-series.component.css'],
  providers: [ DatePipe ]
})
export class ChooseAndShowSeriesComponent implements OnInit {
  @Input() noEventsToShowText = 'No events to show';
  @Input() chooseSeriesSelectPlaceholder = 'Choose Weekly Event';
  selectedSeries: Series;
  series: Series[] = [];
  events: Event[] = [];

  @Input() showEvent: Action = { type: <Type<Component>> ShowEventComponent };

  chooseAndShowSeries;
  private gs: GatewayService;

  constructor(private elem: ElementRef, private gsf: GatewayServiceFactory) {
    this.chooseAndShowSeries = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
  }

  // TODO: should instead make this reactive with Apollo
  maybeFetchEvents(toggle: boolean) {
    if (toggle) {
      this.gs
        .get<SeriesRes>('/graphql', {
          params: {
            query: `
              query {
                series {
                  id,
                  startsOn,
                  endsOn
                }
              }
            `
          }
        })
        .pipe(map((res: SeriesRes) => res.data.series))
        .subscribe((series: GraphQlSeries[]) => {
          this.series = _.map(series, toSeries);
        });
    }
  }

  updateEvents(selectedSeries: Series) {
    this.selectedSeries = selectedSeries;
    this.events = [];
    if (!selectedSeries) {
      return;
    }
    this.gs
      .get<OneSeriesRes>('/graphql', {
        params: {
          query: `
            query {
              oneSeries(id: "${selectedSeries.id}") {
                events {
                  id,
                  startDate,
                  endDate,
                  series {
                    id
                  }
                }
              }
            }
          `
        }
      })
      .pipe(map((res: OneSeriesRes) => res.data.oneSeries.events))
      .subscribe((events: GraphQlEvent[]) => {
        this.events = _.map(events, toEvent);
      });
  }
}
