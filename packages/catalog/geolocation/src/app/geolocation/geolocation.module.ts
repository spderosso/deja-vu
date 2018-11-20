import { CommonModule } from '@angular/common';
import { InjectionToken, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatButtonModule, MatFormFieldModule, MatInputModule
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DvModule } from 'dv-core';

import { AgmCoreModule } from '@agm/core';

import { CreateMarkerComponent } from './create-marker/create-marker.component';
import { DeleteMarkerComponent } from './delete-marker/delete-marker.component';
import { DisplayMapComponent } from './display-map/display-map.component';
import { ShowMarkerComponent } from './show-marker/show-marker.component';
import { ShowMarkersComponent } from './show-markers/show-markers.component';


import {
  API_PATH, CONFIG, GeolocationConfig, GOOGLE_MAPS_API_KEY
} from './geolocation.config';

const allComponents = [
  CreateMarkerComponent,
  DeleteMarkerComponent,
  DisplayMapComponent,
  ShowMarkerComponent,
  ShowMarkersComponent
];

@NgModule({
  imports: [
    BrowserModule,
    CommonModule,
    DvModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    AgmCoreModule.forRoot({
      apiKey: GOOGLE_MAPS_API_KEY
    })
  ],
  providers: [{ provide: API_PATH, useValue: '/graphql' }],
  declarations: allComponents,
  exports: allComponents,
  entryComponents: allComponents
})
export class GeolocationModule { }

export const GEOLOCATION_CONFIG: InjectionToken<GeolocationConfig> = CONFIG;
