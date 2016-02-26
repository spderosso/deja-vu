import {Injectable, Inject} from "angular2/core";
import {Http} from "angular2/http";
import {Observable} from "rxjs/Observable";

import {Content, Publisher, Name} from "../../shared/data";


export interface FeedItem {
  content: Content;
  publisher: Publisher;
}

@Injectable()
export class FeedService {
  constructor(private _http: Http, @Inject("feed.api") private _api: String) {}

  getFeed(sub: Name): Observable<FeedItem> {
    return this._http.get(this._api + `/subs/${sub}/feed`)
      .map(res => res.json())
      .flatMap((pubs: Publisher[], unused_ix) => Observable.fromArray(pubs))
      .flatMap(
          (pub: Publisher, unused_ix: number) => {
            return Observable.fromArray(pub.published);
          },
          (pub: Publisher, content: Content, unused_pubi: number,
           unused_ci: number) => {
            return {content: content, publisher: pub};
          });
  }
}