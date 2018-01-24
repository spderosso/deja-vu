import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, Input, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ActivatedRoute, ParamMap } from '@angular/router';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';

import { Widget, LabelBaseWidget, LinkBaseWidget } from '../../../models/widget/widget';
import { Cliche } from '../../../models/cliche/cliche';
import { Dimensions, Position, StateService } from '../../../services/state.service';
import { ProjectService } from '../../../services/project.service';

import { inArray } from '../../../utility/utility';

import * as jQuery from 'jquery';
import 'jquery-ui-dist/jquery-ui';

const $ = <any>jQuery;

@Component({
  selector: 'dv-worksurface',
  templateUrl: './worksurface.component.html',
  styleUrls: ['./worksurface.component.css']
})
export class WorkSurfaceComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Dimensions of the screen the user is building an app for.
   */
  selectedScreenDimensions: Dimensions;
  selectedWidget$: Observable<Widget[]>;
  selectedWidget: Widget;

  private el: HTMLElement;
  private currentZoom = 1;
  private visibleWindowScroll: Position;
  private subscriptions = [];

  constructor(
    private route: ActivatedRoute,
    elt: ElementRef,
    private stateService: StateService,
    private projectService: ProjectService,
    private ref: ChangeDetectorRef
  ) {
    this.el = elt.nativeElement;

    this.subscriptions.push(stateService.zoom.subscribe((newZoom) => {
      this.currentZoom = newZoom;
    }));

    this.subscriptions.push(stateService.selectedScreenDimensions
      .subscribe((newSelectedScreenDimensions) => {
        this.selectedScreenDimensions = newSelectedScreenDimensions;
      }));

    this.subscriptions.push(stateService.visibleWindowScrollPosition
      .subscribe((newScrollPosition) => {
        this.visibleWindowScroll = newScrollPosition;
        const jqo = $('dv-worksurface');
        jqo.scrollTop(newScrollPosition.top);
        jqo.scrollLeft(newScrollPosition.left);
      }));
  }

  ngOnInit() {
    console.log('worksurface init');
    this.selectedWidget$ = this.route.paramMap.map((params: ParamMap) => {
      const userApp = this.projectService.getProject().getUserApp();
      this.selectedWidget = userApp.getWidget(params.get('id'));

      // Since state service is shared
      this.stateService.updateVisibleWindowScrollPosition({
        top: 0, left: 0
      });
      console.log(this.selectedWidget);
      return [this.selectedWidget];
    });
  }

  ngAfterViewInit() {
    this.handleWindowResize();
    this.makeWorksurfaceDroppable();


    $(this.el).scroll((event: Event) => {
      const elt = $(this.el);
      this.stateService.updateVisibleWindowScrollPosition({
        top: elt.scrollTop(),
        left: elt.scrollLeft()
      });
    });
  }


  private makeWorksurfaceDroppable() {
    $(this.el).droppable({
      accept: 'dv-widget, .widget-component, dv-list-item',
      hoverClass: 'highlight',
      tolerance: 'touch',
      drop: (event, ui) => {
        let widget: Widget = ui.helper.dvWidget;
        if (!widget) {
          return;
        }
        if (widget === this.selectedWidget) {
          widget.updatePosition(this.oldWidgetNewPosition(ui));
        } else if (!this.selectedWidget.isUserType()) {
          // non-user widgets can't be added to.
          return;
        } else {
          const isTemplate = ui.helper.template;
          // Check if it's a new widget
          const isNew = ui.helper.new;
          const project = this.projectService.getProject();
          const userApp = project.getUserApp();
          if (isNew || isTemplate) {
            // create a new widget object.
            let innerWidgets: Widget[];
            if (isNew) {
              // Set the cliche id of the dummy widget to this
              // app id, so that the widget's id is set properly
              // when copying.
              const dummyWidget = widget;
              dummyWidget.setClicheId(userApp.getId());
              innerWidgets = widget.makeCopy(userApp);
              widget = innerWidgets[0];
              // reset the dummy widget
              dummyWidget.setClicheId(undefined);
            } else {
              innerWidgets = widget.makeCopy(userApp, undefined, true);
              widget = innerWidgets[0];
            }

            widget.updatePosition(this.newWidgetNewPosition(ui));

            this.selectedWidget.setAsInnerWidget(userApp, widget);
          } else {
            // it must be an unused widget or an already added widget
            const alreadyAdded =
              inArray(widget.getId(), this.selectedWidget.getInnerWidgetIds());

            if (alreadyAdded) {
              widget.updatePosition(this.oldWidgetNewPosition(ui));
            } else {
              this.selectedWidget.setAsInnerWidget(userApp, widget);
              widget.updatePosition(this.newWidgetNewPosition(ui));
            }
          }
          this.selectedWidget.putInnerWidgetOnTop(userApp, widget);
        }

        this.projectService.widgetUpdated();
        this.ref.detectChanges();
      }
    });
  }

  private newWidgetNewPosition(ui): Position {
    const offset = this.selectedWidget.getPosition();
    return {
      top: ui.position.top - offset.top,
      left: ui.position.left - offset.left
    };
  }

  private oldWidgetNewPosition(ui): Position {
    return ui.position;
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
    console.log('destroyed');
  }

  handleWindowResize() {
    const windowjq = $(window);

    const windowSize = {
      height: windowjq.height(),
      width: windowjq.width()
    };
    const newSize = {
      height: windowSize.height - 60,
      width: windowSize.width - 250
    };
    this.el.style.height = newSize.height + 'px';
    this.el.style.width = newSize.width + 'px';
    console.log('resizing');
    // Without setTimeout causes an
    // ExpressionChangedAfterItHasBeenCheckedError
    // setTimeout(() => {
      this.stateService.updateVisibleWindowDimensions(newSize);
    // }, 0);
  }


  private update(id?) {

  }
}
