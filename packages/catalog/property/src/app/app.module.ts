import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';

import { DvModule, GATEWAY_URL, USED_CLICHES_CONFIG } from '@deja-vu/core';

import { PropertyModule } from './property/property.module';

const usedClichesConfig = {
  property: {
    config: {
      initialObjects: [
        {firstName: 'Alyssa', lastName: 'Hacker', age: 20}
      ],
      schema: {
        title: 'Person',
        type: 'object',
        properties: {
            firstName: {
                type: 'string'
            },
            lastName: {
                type: 'string'
            },
            age: {
             description: 'Age in years',
             type: 'integer',
             minimum: 0
            }
        },
        required: ['firstName', 'lastName']
      }
    }
  }
};


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    DvModule,
    PropertyModule
  ],
  providers: [
    { provide: GATEWAY_URL, useValue: 'localhost:3000/api' },
    { provide: USED_CLICHES_CONFIG, useValue: usedClichesConfig }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
