import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatButtonModule, MatCheckboxModule, MatFormFieldModule,
  MatInputModule, MatSelectModule, MatTableModule
} from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HttpClientModule } from '@angular/common/http';
import { ButtonLastComponent } from './button-last/button-last.component';
import { ButtonComponent } from './button/button.component';
import { CallbackLinkComponent } from './callback-link/callback-link.component';
import { CallbackComponent } from './callback/callback.component';
import { ChooseComponent } from './choose/choose.component';
import { DifferenceComponent } from './difference/difference.component';
import { FilterComponent } from './filter/filter.component';
import { ForComponent } from './for/for.component';
import { GatewayServiceFactory } from './gateway.service';
import { GenIdComponent } from './gen-id/gen-id.component';
import { GenIdsComponent } from './gen-ids/gen-ids.component';
import { GroupByComponent } from './group-by/group-by.component';
import {
  IncludeComponent, IncludeDirective
} from './include/include.component';
import { InputIdComponent } from './input-id/input-id.component';
import { IntersectComponent } from './intersect/intersect.component';
import { LinkComponent } from './link/link.component';
import { MergeComponent } from './merge/merge.component';
import { PickComponent } from './pick/pick.component';
import { RedirectComponent } from './redirect/redirect.component';
import { RunService } from './run.service';
import { ShowCountComponent } from './show-count/show-count.component';
import { ShowEntitiesComponent } from './show-entities/show-entities.component';
import { ShowEntityComponent } from './show-entity/show-entity.component';
import { StageComponent } from './stage/stage.component';
import { StatusComponent } from './status/status.component';
import { TableComponent } from './table/table.component';
import { TxComponent } from './tx/tx.component';
import { UnionComponent } from './union/union.component';
import { ZipComponent } from './zip/zip.component';

import { ConfigServiceFactory } from './config.service';
import { OfDirective } from './of.directive';
import { StorageService } from './storage.service';
import { SubscriptionService } from './subscription.service';
import { CamelToTitleCasePipe } from './stage/stage.component';


const allComponents = [
  GenIdComponent, GenIdsComponent, TxComponent, IncludeComponent,
  IncludeDirective, ButtonLastComponent, ButtonComponent, LinkComponent,
  StatusComponent, MergeComponent, InputIdComponent, StageComponent,
  ChooseComponent, CallbackComponent, CallbackLinkComponent,
  RedirectComponent, ZipComponent, ShowCountComponent,
  ForComponent, ShowEntitiesComponent, UnionComponent,
  IntersectComponent, ShowEntityComponent, TableComponent,
  DifferenceComponent, GroupByComponent, PickComponent, FilterComponent
];

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule, ReactiveFormsModule,
    BrowserAnimationsModule,
    // Material
    MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatTableModule, MatCheckboxModule
  ],
  declarations: [
    ...allComponents,
    OfDirective,
    CamelToTitleCasePipe
  ],
  providers: [
    GatewayServiceFactory, RunService, ConfigServiceFactory, StorageService,
    SubscriptionService
  ],
  entryComponents: [ShowEntityComponent],
  exports: [...allComponents, OfDirective]
})
export class DvModule { }
