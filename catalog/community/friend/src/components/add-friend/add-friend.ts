import {Component} from "angular2/core";
import {HTTP_PROVIDERS} from "angular2/http";

import {User, Username} from "../../shared/user";
import {GraphQlService} from "gql";


@Component({
  selector: "add-friend",
  templateUrl: "./components/add-friend/add-friend.html",
  styleUrls: ["./components/add-friend/add-friend.css"],
  providers: [GraphQlService, HTTP_PROVIDERS],
  inputs: ["username"]
})
export class AddFriendComponent {
  potentialFriends: User[];
  private _username: Username;

  constructor(private _graphQlService: GraphQlService) {}

  addFriend(user: User) {
    console.log(`adding ${user.username} as friend`);
    this._graphQlService
      .post(`
        addFriend(username1: "${this._username}", username2: "${user.username}")
      `)
      .subscribe(res => undefined);
  }

  get username() {
    return this._username;
  }

  set username(username: Username) {
    if (!username) return;
    console.log("got username " + username);
    this._username = username;
    this._graphQlService
      .post(`
        user(username: "${this._username}") {
          potentialFriends {
            username
          } 
        }
      `)
      .subscribe(potentialFriends => this.potentialFriends = potentialFriends);
  }
}
