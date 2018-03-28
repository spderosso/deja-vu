import {
  Component, ElementRef, EventEmitter,
  Input, OnInit
} from '@angular/core';
import { OnRun, RunService } from 'dv-core';

import * as _ from 'lodash';

@Component({
  selector: 'authentication-sign-out',
  templateUrl: './sign-out.component.html',
  styleUrls: ['./sign-out.component.css']
})
export class SignOutComponent implements OnInit, OnRun {
  @Input() buttonLabel = 'Sign Out';

  constructor(private elem: ElementRef, private rs: RunService) {}

  ngOnInit() {
    this.rs.register(this.elem, this);
  }

  signOut() {
    this.rs.run(this.elem);
  }

  dvOnRun() {
    localStorage.removeItem('id_token');
    localStorage.removeItem('user');
  }
}
