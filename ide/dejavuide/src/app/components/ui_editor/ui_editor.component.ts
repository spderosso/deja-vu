import { Component, OnInit, ViewChild } from '@angular/core';

import { Dimensions, Position } from '../../utility/utility';
import { BaseWidget, Widget, UserWidget } from '../../models/widget/widget';
import { Cliche, UserCliche } from '../../models/cliche/cliche';
import { MapComponent } from './map/map.component';

import * as jQ from 'jquery';
const $ = <any>jQ;

@Component({
  selector: 'dv-ui-editor',
  templateUrl: './ui_editor.component.html',
  styleUrls: ['./ui_editor.component.css']
})
export class UiEditorComponent implements OnInit {
  @ViewChild(MapComponent)
  private map: MapComponent;

  outerContainerDimensions: Dimensions = {
    width: 800,
    height: 500
  };

  screenDimensions: Dimensions = {
    width: 2000,
    height: 1000
  };

  outerContainerScroll: Position = {
    top: 0,
    left: 0
  };

  userApp = new UserCliche('app');
  appId = this.userApp.getId();
  selectedWidget = new UserWidget('test',
                                  { height: 600, width: 800 },
                                  this.appId
                                );
  allCliches = new Map<string, Cliche>();

  /**
   * Handles when any of the widgets in the app changes (i.e., resize
   * or changing positions).
   */
  handleWidgetChange() {
    // Currently just updates the map views
    this.map.updateView();
  }

  ngOnInit() {
    // Currently for testing
    // We create a main widget, give it some nester (inner) widgets
    // and give them some interesting sizes and positions.
    this.allCliches.set(this.userApp.getId(), this.userApp);
    this.userApp.addPage(this.selectedWidget);

    this.selectedWidget.updatePosition({ top: 100, left: 300 });
    Widget.addWidgetToCliche(this.allCliches, this.selectedWidget);
    const innerWidget1 = new BaseWidget('test inner1', { height: 100, width: 200 }, 'img', '/', this.appId);
    innerWidget1.addWidgetToCliche(this.allCliches);
    this.selectedWidget.addInnerWidget(innerWidget1.getId());
    innerWidget1.updatePosition({ top: 50, left: 100 });

    const innerWidget2 = new UserWidget('test inner2', { height: 200, width: 400 }, this.appId);
    innerWidget2.addWidgetToCliche(this.allCliches);
    this.selectedWidget.addInnerWidget(innerWidget2.getId());
    innerWidget2.updatePosition({ top: 200, left: 200 });

    const innerWidget21 = new UserWidget('test inner21', { height: 100, width: 100 }, this.appId);
    innerWidget21.addWidgetToCliche(this.allCliches);
    innerWidget2.addInnerWidget(innerWidget21.getId());
    innerWidget21.updatePosition({ top: 50, left: 100 });
  }

  handleMapScroll(e) {
    $('.outer-container').scrollTop(e.top);
    $('.outer-container').scrollLeft(e.left);
  }

  handleZoomChange(e) {
    console.log(e);
  }
}
