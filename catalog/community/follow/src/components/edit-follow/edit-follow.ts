import {Component} from "angular2/core";
import {HTTP_PROVIDERS} from "angular2/http";

import {Target, Name} from "../../shared/data";
import {GraphQlService} from "gql";


export interface SourceFollowInfo {
  name: Name;
  followed_by: boolean;
}

@Component({
  selector: "edit-follow",
  templateUrl: "./components/edit-follow/edit-follow.html",
  providers: [GraphQlService, HTTP_PROVIDERS],
  inputs: ["name"]
})
export class EditFollowComponent {
  targets: SourceFollowInfo[];
  private _name: Name;

  constructor(private _graphQlService: GraphQlService) {}

  follow(target: Target) {
    console.log(`following ${target.name}`);
    this._graphQlService
      .post(`follow(source: "${this._name}", target: "${target.name}")`)
      .subscribe(res => undefined);
  }

  unfollow(target: Target) {
    console.log(`unfollowing ${target.name}`);
    this._graphQlService
      .post(`unfollow(source: "${this._name}", target: "${target.name}")`)
      .subscribe(res => undefined);
  }

  get name() {
    return this._name;
  }

  set name(name: Name) {
    if (!name) return;
    console.log("got name " + name);
    this._name = name;
    this._graphQlService
      .get(`
        targets {
          name,
          followed_by(name: "${this._name}")
        }
      `)
      .map(data => data.targets.filter(u => u.name !== this._name))
      .subscribe(targets => this.targets = targets);
  }
}
