import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material';
import * as _ from 'lodash';

import { App, AppActionDefinition } from '../datatypes';

interface ControlGroup {
  form: { valid: boolean };
}

export interface DialogData {
  app: App;
  action?: AppActionDefinition;
}

@Component({
  selector: 'app-configure-action',
  templateUrl: './configure-action.component.html',
  styleUrls: ['./configure-action.component.scss']
})
export class ConfigureActionComponent implements OnInit {
  name: string;
  page: boolean;
  home: boolean;
  transaction: boolean;

  constructor(
    public dialogRef: MatDialogRef<ConfigureActionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) { }

  ngOnInit() {
    if (this.data.action) {
      this.name = this.data.action.name;
      this.page = this.actionIsPage();
      this.home = this.data.app.homepage === this.data.action;
    }
  }

  actionIsPage(action?: AppActionDefinition): boolean {
    action = action ? action : this.data.action;

    return this.data.app.pages.includes(action);
  }

  makeActionPage(action?: AppActionDefinition) {
    action = action ? action : this.data.action;
    if (!this.actionIsPage(action)) {
      this.data.app.pages.push(action);
    }
  }

  makeActionNotPage(action?: AppActionDefinition) {
    action = action ? action : this.data.action;
    _.remove(this.data.app.pages, (p) => p === action);
  }

  validate(form: ControlGroup) {
    return form.form.valid;
  }

  cancel() {
    this.dialogRef.close();
  }

  delete() {
    this.data.app.actions.forEach((ad) => {
      ad.rows.forEach((r) => {
        _.remove(r.actions, (ai) => (
          ai.of === this.data.action
          && ai.from === this.data.app
        ));
      });
    });
    _.remove(this.data.app.actions, (ad) => ad === this.data.action);
  }

  save() {
    let action: AppActionDefinition;

    if (this.data.action) {
      action = this.data.action;
      action.name = this.name;
    } else {
      action = new AppActionDefinition(this.name);
      this.data.app.actions.push(action);
    }

    if (this.page) {
      this.makeActionPage(action);
    } else {
      this.makeActionNotPage(action);
    }

    this.dialogRef.close();
  }

  makeHomepage() {
    this.makeActionPage();
    this.data.app.homepage = this.data.action;
  }

}
