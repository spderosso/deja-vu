import {Injectable, Inject} from "angular2/core";
import {Http, Headers} from "angular2/http";
import {Observable} from "rxjs/observable";

import {User, Username} from "../../shared/user";


@Injectable()
export class FriendService {
  constructor(
    private _http: Http, @Inject("friend.api") private _api: String) {}

  getFriends(username: Username): Observable<User[]> {
    return this._get(`{
      user(username: "${username}") {
        username,
        friends {
          username
        } 
      }
    }`).map(user => user.friends);
  }

  addFriend(username1: Username, username2: Username): any {
    return this._post(`{
      addFriend(username1: "${username1}", username2: "${username2}")
    }`);
  }

  unfriend(username1: Username, username2: Username): any {
    return this._post(`{
      unfriend(username1: "${username1}", username2: "${username2}")
    }`);
  }

  getPotentialFriends(username: Username): Observable<User[]> {
    return this._get(`{
      user(username: "${username}") {
        username,
        potentialFriends {
          username
        } 
      }
    }`).map(user => user.potentialFriends);
  }

  private _post(query) {
    const headers = new Headers();
    headers.append("Content-type", "application/json");
    const query_str = query.replace(/ /g, "");

    return this._http
      .post(
          this._api + "/graphql",
          JSON.stringify({query: "mutation " + query_str}),
          {headers: headers})
      .map(res => res.json());
  }

  private _get(query) {
    const query_str = query.replace(/ /g, "");
    return this._http
      .get(this._api + `/graphql?query=query+${query_str}`)
      .map(res => res.json())
      .map(json_res => json_res.data.user);
  }
}