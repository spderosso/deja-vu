import { async, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

import { BrowserModule } from '@angular/platform-browser';

import { DvModule, GATEWAY_URL, USED_CONCEPTS_CONFIG } from '@deja-vu/core';
import { AuthenticationModule } from './authentication/authentication.module';


describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      imports: [
        BrowserModule,
        AuthenticationModule,
        RouterTestingModule,
        DvModule
      ],
      providers: [
        { provide: GATEWAY_URL, useValue: 'test' },
        { provide: USED_CONCEPTS_CONFIG, useValue: {} }
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

  it(`should have as title 'authentication'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title)
      .toEqual('authentication');
  }));
});
