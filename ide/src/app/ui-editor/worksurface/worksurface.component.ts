import { Component, OnInit, AfterViewInit, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/map';

import { Widget, LabelBaseWidget, LinkBaseWidget } from '../../core/models/widget/widget';
import { Cliche } from '../../core/models/cliche/cliche';
import { StateService } from '../services/state.service';
import { ProjectService } from '../../core/services/project.service';

import { Dimensions, Position } from '../../core/utility/utility';
import { some } from 'lodash/collection';

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
  selectedWidget: BehaviorSubject<Widget>;

  activeWidgets: Widget[] = [];

  private el: HTMLElement;
  private zoom;
  private visibleWindowScroll: Position;
  private subscriptions = [];

  constructor(
    el: ElementRef,
    private stateService: StateService,
    private projectService: ProjectService,
    private zone: NgZone
  ) {
    this.el = el.nativeElement;

    this.zoom = stateService.zoom.map((newZoom) => newZoom);

    this.subscriptions.push(
      stateService.selectedScreenDimensions.subscribe(
        (newSelectedScreenDimensions) => {
          this.selectedScreenDimensions = newSelectedScreenDimensions;
        }));

    this.subscriptions.push(
      stateService.visibleWindowScrollPosition.subscribe(
        (newScrollPosition) => {
          this.visibleWindowScroll = newScrollPosition;
          const worksurfaceElt = $('dv-worksurface');
          worksurfaceElt.scrollTop(newScrollPosition.top);
          worksurfaceElt.scrollLeft(newScrollPosition.left);
        }));

    this.subscriptions.push(
      this.projectService.selectedWidget.subscribe((selectedWidget: Widget) => {
        const activeWidgetIds = this.activeWidgets.map(widget => widget.getId());
        const id = selectedWidget.getId();
        const alreadyAdded = some(activeWidgetIds, id);

        if (!alreadyAdded) {
          this.activeWidgets.push(selectedWidget);
        }

        // Since state service is shared
        this.stateService.updateVisibleWindowScrollPosition({
          top: 0, left: 0
        });
      })
    );
  }

  ngOnInit() {
    this.selectedWidget = this.projectService.selectedWidget;
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
      accept: 'dv-widget-display, dv-list-item',
      hoverClass: 'highlight',
      tolerance: 'touch',
      drop: (event, ui) => {
        // The zone brings this piece of code back into angular's zone
        // so that angular detects the changes properly
        this.zone.run(() => {
          this.onDrop(event, ui);
        });
      }
    });
  }

  private onDrop(event, ui) {
    let widget: Widget = ui.helper.dvWidget;

    const project = this.projectService.getProject();
    const userApp = project.getUserApp();

    const selectedWidget = this.selectedWidget.getValue();
    if (!widget) {
      return;
    }
    if (widget === selectedWidget) {
      widget.updatePosition(this.oldWidgetNewPosition(ui));
    } else if (!selectedWidget.isUserType()) {
      // non-user widgets can't be added to.
      return;
    } else {
      const isTemplate = ui.helper.template;
      // Check if it's a new widget
      const isNew = ui.helper.new;
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

        widget.updatePosition(this.newWidgetNewPosition(ui, selectedWidget));

        selectedWidget.setAsInnerWidget(userApp, widget);
      } else {
        // it must be an unused widget or an already added widget
        const alreadyAdded =
          some(selectedWidget.getInnerWidgetIds(), widget.getId());

        if (alreadyAdded) {
          widget.updatePosition(this.oldWidgetNewPosition(ui));
        } else {
          selectedWidget.setAsInnerWidget(userApp, widget);
          widget.updatePosition(this.newWidgetNewPosition(ui, selectedWidget));
        }
      }
      selectedWidget.putInnerWidgetOnTop(userApp, widget);
    }

    this.projectService.userAppUpdated();
  }

  private newWidgetNewPosition(ui, selectedWidget: Widget): Position {
    const offset = selectedWidget.getPosition();
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
    setTimeout(() => {
      this.stateService.updateVisibleWindowDimensions(newSize);
    }, 0);
  }
}