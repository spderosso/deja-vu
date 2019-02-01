import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DragulaModule } from 'ng2-dragula';
import { NgxElectronModule } from 'ngx-electron';
import { QuillModule } from 'ngx-quill';

import { DvModule, GATEWAY_URL } from 'dv-core';

import { ClicheModule } from './cliche.module';
import { MatModule } from './mat.module';

import { ClicheActionDirective } from './cliche-action.directive';

import {
  ActionDefinitionComponent
} from './action-definition/action-definition.component';
import {
  ActionInstanceComponent
} from './action-instance/action-instance.component';
import { AppComponent } from './app.component';
import {
  ConfigureActionComponent
} from './configure-action/configure-action.component';
import {
  ConfigureClicheComponent
} from './configure-cliche/configure-cliche.component';
import { RowComponent } from './row/row.component';
import { SideMenuComponent } from './side-menu/side-menu.component';
import { TextComponent } from './text/text.component';
import { TopBarComponent } from './top-bar/top-bar.component';

@NgModule({
  declarations: [
    ActionDefinitionComponent,
    ActionInstanceComponent,
    AppComponent,
    ConfigureActionComponent,
    ConfigureClicheComponent,
    RowComponent,
    SideMenuComponent,
    TextComponent,
    TopBarComponent,
    ClicheActionDirective
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatModule,
    DragulaModule.forRoot(),
    NgxElectronModule,
    QuillModule,
    DvModule,
    ClicheModule
  ],
  providers: [
    { provide: GATEWAY_URL, useValue: 'http://localhost:8080/api' }
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    ConfigureActionComponent,
    ConfigureClicheComponent,
    TextComponent
  ]
})
export class AppModule { }