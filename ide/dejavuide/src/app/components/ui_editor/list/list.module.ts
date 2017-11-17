import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { ListComponent } from './list.component';
import { ListItemModule } from './list_item/list_item.module';

@NgModule({
  declarations: [
    ListComponent
  ],
  imports: [
    BrowserModule,
    ListItemModule
  ],
  providers: [],
  exports: [
    ListComponent
  ]
})
export class ListModule { }
