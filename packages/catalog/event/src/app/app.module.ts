import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { DvModule, GATEWAY_URL, USED_CONCEPTS_CONFIG } from '@deja-vu/core';
import { AppComponent } from './app.component';
import { EventModule } from './event/event.module';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    EventModule,
    RouterModule.forRoot([]),
    DvModule
  ],
  providers: [
    { provide: GATEWAY_URL, useValue: 'localhost:3000/api' },
    { provide: USED_CONCEPTS_CONFIG, useValue: {} }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
