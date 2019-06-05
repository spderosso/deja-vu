import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject,
  Input, OnChanges, OnInit, Output, Type
} from '@angular/core';

import {
  Action, GatewayService, GatewayServiceFactory, OnEval, RunService
} from '@deja-vu/core';

import { User } from '../shared/authentication.model';
import { ShowUserComponent } from '../show-user/show-user.component';

import { API_PATH } from '../authentication.config';

import * as _ from 'lodash';


@Component({
  selector: 'authentication-show-users',
  templateUrl: './show-users.component.html',
  styleUrls: ['./show-users.component.css']
})
export class ShowUsersComponent implements AfterViewInit, OnEval, OnInit,
  OnChanges {
  @Input() showUsername = true;
  @Input() showId = true;

  @Input() showUser: Action = {
    type: <Type<Component>> ShowUserComponent
  };
  @Input() noUsersToShowText = 'No users to show';
  users: User[] = [];

  @Output() fetchedUsers = new EventEmitter<User[]>();
  @Output() fetchedUserIds = new EventEmitter<string[]>();

  showUsers;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, @Inject(API_PATH) private apiPath) {
    this.showUsers = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  ngAfterViewInit() {
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  load() {
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs
        .get<{ data: { users: User[] } }>(this.apiPath, {
          params: {
            inputs: JSON.stringify({
              input: {}
            }),
            extraInfo: {
              returnFields: `
                ${this.showId ? 'id' : ''}
                ${this.showUsername ? 'username' : ''}
              `
            }
          }
        })
        .subscribe((res) => {
          this.users = res.data.users;
          this.fetchedUsers.emit(this.users);
          this.fetchedUserIds.emit(_.map(this.users, 'id'));
        });
    } else if (this.gs) {
      this.gs.noRequest();
    }
  }

  private canEval(): boolean {
    return !!(this.gs);
  }
}
