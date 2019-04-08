import { async, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

import { BrowserModule } from '@angular/platform-browser';

import { DvModule, GATEWAY_URL, USED_CLICHES_CONFIG } from '@deja-vu/core';
import { <%= classify(clicheName) %>Module } from './<%= dasherize(clicheName) %>/<%= dasherize(clicheName) %>.module';


describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      imports: [
        BrowserModule,
        <%= classify(clicheName) %>Module,
        DvModule
      ],
      providers: [
        { provide: GATEWAY_URL, useValue: 'test' },
        { provide: USED_CLICHES_CONFIG, useValue: {} }
      ]
    })
      .compileComponents();
  }));

  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app)
      .toBeTruthy();
  }));

  it(`should have as title '<%= dasherize(clicheName) %>'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title)
      .toEqual('<%= dasherize(clicheName) %>');
  }));
});