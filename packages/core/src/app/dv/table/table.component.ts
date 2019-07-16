import {
  Component, ElementRef, Input, Type
} from '@angular/core';
import { MatTableDataSource } from '@angular/material';

import { RunService } from '../run.service';
import { Action } from '../include/include.component';

export interface ColumnConfiguration {
  label: string;
  fieldName: string;
}

@Component({
  selector: 'dv-table',
  templateUrl: './table.component.html'
})
export class TableComponent {
  /**
   * A list of entities to show on the table
   */
  @Input() data: any[] = [];

  /**
   * A list of objects that defines the row names and corresponding field names
   */
  @Input() columnInfo: ColumnConfiguration[] = [];

  /**
   * Action that can be performed on each row
   */
  @Input() rowAction: Action | undefined;

  /**
   * Text to display when empty list or undefined entities are passed in
   */
  @Input() noDataToShowText = 'No Data';
  table;
  displayedColumns;

  constructor(private elem: ElementRef, private rs: RunService) {
    this.table = this;
  }

  ngOnInit() {
    this.rs.register(this.elem, this);
    this.displayedColumns = this.rowAction ? this.columnInfo
      .map((column) => column.fieldName)
      .concat('rowAction') :
      this.columnInfo.map((column) => column.fieldName);
  }
}
