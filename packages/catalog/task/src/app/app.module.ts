import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { TaskModule } from './task/task.module';

import { GATEWAY_URL } from 'dv-core';

import { AppComponent } from './app.component';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    TaskModule
  ],
  providers: [{provide: GATEWAY_URL, useValue: 'http://localhost:3000/api'}],
  bootstrap: [AppComponent]
})
export class AppModule { }