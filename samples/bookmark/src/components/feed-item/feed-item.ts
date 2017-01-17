import {Widget} from "client-bus";

import {provide} from "angular2/core";


@Widget({
  fqelement: "dv-samples-bookmark",
  template: `
    <div class="list-group">
      <h4 class="list-group-item-heading">
        <dv-widget name="Author" fqelement="dv-messaging-post"
         [fields]="fields" [hosts]="hosts">
        </dv-widget>
      </h4>
      <p class="list-group-item-text">
        {{post.content}}
      </p>
      <div class="list-group-item-text">
        <dv-widget name="Labels" fqelement="dv-organization-label"
         [fields]="fields" [hosts]="hosts">
        </dv-widget>
      </div>
      <div class="list-group-item-text">
        <dv-widget name="CommentsWithComment" fqelement="dv-messaging-comment"
         [fields]="fields" [hosts]="hosts">
        </dv-widget>
      </div>

    </div>
  `
})
export class FeedItemComponent {
  post = {};
}
