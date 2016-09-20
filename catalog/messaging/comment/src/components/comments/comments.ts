import {HTTP_PROVIDERS} from "angular2/http";

import {GraphQlService} from "gql";

import {Widget} from "client-bus";

import {CommentComponent} from "../comment/comment";


@Widget({
  ng2_providers: [GraphQlService, HTTP_PROVIDERS],
  ng2_directives: [CommentComponent]
})
export class CommentsComponent {
  comments: any[];
  target = {name: "", atom_id: "", on_change: _ => undefined};

  constructor(private _graphQlService: GraphQlService) {}

  dvAfterInit() {
    const update_comments = () => {
      if (!this.target.atom_id) return;
      console.log("got new target" + this.target.atom_id);

      this.comments = [];
      this._graphQlService
        .get(`
          target_by_id(atom_id: "${this.target.atom_id}") {
            comments {
              content,
              author {
                name
              }
            }
          }
        `)
        .map(data => data.target_by_id.comments)
        .subscribe(comments => {
          this.comments = comments;
        });
    };

    update_comments();
    this.target.on_change(update_comments);
  }
}
