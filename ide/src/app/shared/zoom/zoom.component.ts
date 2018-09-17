import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { Dimensions, Position } from '../../core/utility/utility';

enum ZoomType {
  SLIDER, FIT, FULL, ACTUAL
}

const CHEVRON = {
    LEFT: 'glyphicon glyphicon-chevron-left',
    RIGHT: 'glyphicon glyphicon-chevron-right'
};

@Component({
  selector: 'dv-zoom',
  templateUrl: './zoom.component.html',
  styleUrls: ['./zoom.component.css']
})
export class ZoomComponent implements OnInit {
  /**
   * The dimensions of the component in focus. Needed for FIT.
   */
  @Input() componentDimensions: Dimensions | null;
  /**
   * The dimensions of the visible part of this component. Needed for
   * FIT and FULL.
   */
  @Input() visibleWindowDimensions: Dimensions | null;
  /**
   * The dimensions of the container containing the component. Needed for
   * FULL.
   */
  @Input() containerDimensions: Dimensions | null;

  @Output() zoom = new EventEmitter<number>();

  readonly sliderMinVal = -300;
  readonly sliderMaxVal = 300;
  readonly ZoomType = ZoomType;

  zoomControlText = '100%';
  sliderVal = 0;
  minimized = false;
  chevron = CHEVRON.RIGHT;

  private currentZoom: number;

  full = false;
  fit = false;

  ngOnInit() {
    this.full = !!(this.visibleWindowDimensions && this.containerDimensions);
    this.fit = !!(this.visibleWindowDimensions && this.componentDimensions);
  }

  zoomTypeButtonClick(type: ZoomType) {
    this.changeZoomViaZoomControl(type);
    this.sliderVal = this.getSliderValFromZoom(this.currentZoom);
    this.zoomChanged();
  }

  zoomButtonClick(e: MouseEvent, out: boolean) {
    e.preventDefault();
    if (this.sliderVal >= this.sliderMaxVal
      || this.sliderVal <= this.sliderMinVal) {
      return;
    }
    const diff = out ? -100 : 100;
    this.sliderVal = Math.round(this.sliderVal / 100) * 100 + diff;
    this.changeZoomViaZoomControl(ZoomType.SLIDER);
    this.zoomChanged();
  }

  zoomSliderInput(newVal: string) {
    this.sliderVal = parseFloat(newVal);
    this.changeZoomViaZoomControl(ZoomType.SLIDER);
    this.zoomChanged();
  }

  minimize() {
    if (this.minimized) {
        this.minimized = false;
        this.chevron = CHEVRON.RIGHT;
    } else {
        this.minimized = true;
        this.chevron = CHEVRON.LEFT;
    }
  }

  private changeZoomViaZoomControl(type: ZoomType) {
    switch (type) {
    case ZoomType.SLIDER:
        this.currentZoom = this.getZoomFromSliderVal();
        break;
    case ZoomType.FIT:
        const zoomHeight = this.visibleWindowDimensions.height /
                                this.componentDimensions.height;
        const zoomWidth = this.visibleWindowDimensions.width /
                                this.componentDimensions.width;
        this.currentZoom = Math.min(zoomWidth, zoomHeight);
        break;
    case ZoomType.FULL:
        const widthScale =  this.visibleWindowDimensions.width /
                                this.containerDimensions.width;
        const heightScale = this.visibleWindowDimensions.height /
                                this.containerDimensions.height;
        this.currentZoom = Math.min(widthScale, heightScale);
        break;
    case ZoomType.ACTUAL:
        this.sliderVal = 0;
        this.currentZoom = 1;
        break;
    }

    // clip for extremes
    this.currentZoom = Math.max(Math.min(this.currentZoom, 4), .25);
  }

  private getSliderValFromZoom(zoom: number): number {
    // TODO make this better? Currently < 0 is a linear scale
    // whereas > 0 is exp scale
    let val: number;
    if (zoom === 1) {
        val = 0;
    } else if ( zoom > 1 ) {
        val = (zoom - 1) * 100;
    } else {
        val = (zoom - 1) * (this.sliderMaxVal + 100);
    }
    return Math.round(val);
  }

  private getZoomFromSliderVal(): number {
    // TODO make this better? Currently < 0 is a linear scale
    // whereas > 0 is exp scale
    const val = this.sliderVal;
    let zoom: number;

    if (val === 0) {
        zoom = 1;
    } else if (val > 0) {
        zoom = (val + 100) / 100;
    } else {
        zoom = 1 + val / (this.sliderMaxVal + 100);
    }
    return zoom;
  }

  private makeZoomText(zoom: number): string {
    return Math.round(zoom * 100) + '%';
  }

  private zoomChanged() {
    this.zoom.next(this.currentZoom);
    this.zoomControlText = this.makeZoomText(this.getZoomFromSliderVal());
  }
}