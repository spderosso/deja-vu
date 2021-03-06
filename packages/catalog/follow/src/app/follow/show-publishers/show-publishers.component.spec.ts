import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowPublishersComponent } from './show-publishers.component';

import { config } from '../testing/testbed.config';


describe('ShowPublishersComponent', () => {
  let component: ShowPublishersComponent;
  let fixture: ComponentFixture<ShowPublishersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(config)
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowPublishersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component)
      .toBeTruthy();
  });
});
