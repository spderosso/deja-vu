import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { DvModule, GATEWAY_URL } from 'dv-core';

import { AppComponent } from './app.component';

@@componentImports

@@moduleImports

const components = [ AppComponent, @@components ];

@NgModule({
  declarations: components,
  imports: [
    BrowserModule,
    DvModule,
    RouterModule.forRoot([ @@routes ]),
    @@modules
  ],
  entryComponents: components,
  providers: [{
    provide: GATEWAY_URL, useValue: 'http://localhost:3000/api'
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
