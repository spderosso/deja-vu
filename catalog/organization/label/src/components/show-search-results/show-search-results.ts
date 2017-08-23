import {Widget, Field} from "client-bus";

import {ItemArrAtom} from "../_shared/data";

@Widget({fqelement: "Label"})
export class ShowSearchResultsComponent {
  @Field("[Item]") items : ItemArrAtom; // TODO: Change once arrays work
}