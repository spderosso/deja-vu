import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatExpansionModule,
  MatIconModule,
  MatListModule,
  MatTabsModule,
  MatTooltipModule
} from '@angular/material';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SideMenuComponent } from './side-menu.component';

import {
  ClicheInstancesComponent
} from '../cliche-instances/cliche-instances.component';
import {
  InsertActionComponent
} from '../insert-action/insert-action.component';

describe('SideMenuComponent', () => {
  let component: SideMenuComponent;
  let fixture: ComponentFixture<SideMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SideMenuComponent,
        InsertActionComponent,
        ClicheInstancesComponent
      ],
      imports: [
        BrowserAnimationsModule,
        MatDialogModule,
        MatExpansionModule,
        MatIconModule,
        MatListModule,
        MatTabsModule,
        MatTooltipModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SideMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component)
      .toBeTruthy();
  });
});
