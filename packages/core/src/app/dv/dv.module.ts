import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule
} from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HttpClientModule } from '@angular/common/http';
import { ButtonLastComponent } from './button-last/button-last.component';
import { ButtonComponent } from './button/button.component';
import { CallbackLinkComponent } from './callback-link/callback-link.component';
import { CallbackComponent } from './callback/callback.component';
import { ChooseComponent } from './choose/choose.component';
import { GatewayServiceFactory } from './gateway.service';
import { GenIdComponent } from './gen-id/gen-id.component';
import { GenIdsComponent } from './gen-ids/gen-ids.component';
import {
  IncludeComponent, IncludeDirective
} from './include/include.component';
import { InputIdComponent } from './input-id/input-id.component';
import { LinkComponent } from './link/link.component';
import { MergeComponent } from './merge/merge.component';
import { RedirectComponent } from './redirect/redirect.component';
import { RunService } from './run.service';
import { StageComponent } from './stage/stage.component';
import { StatusComponent } from './status/status.component';
import { TxComponent } from './tx/tx.component';
import { ZipComponent } from './zip/zip.component';

import { OfDirective } from './of.directive';
import { ConfigService } from './config.service';


const allComponents = [
  GenIdComponent, GenIdsComponent, TxComponent, IncludeComponent,
  IncludeDirective, ButtonLastComponent, ButtonComponent, LinkComponent,
  StatusComponent, MergeComponent, InputIdComponent, StageComponent,
  ChooseComponent, CallbackComponent, CallbackLinkComponent,
  RedirectComponent, ZipComponent
];

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule, ReactiveFormsModule,
    BrowserAnimationsModule,
    // Material
    MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule
  ],
  declarations: [...allComponents, OfDirective],
  providers: [ GatewayServiceFactory, RunService, ConfigService ],
  exports: [...allComponents, OfDirective]
})
export class DvModule { }