import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { GATEWAY_URL, DvModule } from '@deja-vu/core';
import { AppComponent } from './app.component';
import { <%= classify(conceptName) %>Module } from './<%= dasherize(conceptName) %>/<%= dasherize(conceptName) %>.module';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    <%= classify(conceptName) %>Module,
    DvModule
  ],
  providers: [{ provide: GATEWAY_URL, useValue: 'localhost:3000/api' }],
  bootstrap: [AppComponent]
})
export class AppModule { }
