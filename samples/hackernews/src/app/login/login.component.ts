import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'hackernews-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  callback: string = '/news';

  constructor() {}

  ngOnInit() {
  }
}
