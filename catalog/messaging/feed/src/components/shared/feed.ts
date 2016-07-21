import {Injectable, Inject} from "angular2/core";
import {Http} from "angular2/http";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/map";
import "rxjs/add/observable/fromArray";
import "rxjs/add/operator/mergeMap";

import {Message, Publisher, Name} from "../../shared/data";


export interface FeedItem {
  message: Message;
  publisher: Publisher;
}

@Injectable()
export class FeedService {
  constructor(private _http: Http, @Inject("feed.api") private _api: String) {}

  getFeed(sub: Name): Observable<FeedItem> {
    return this._get(`{
      sub(name: "${sub}") {
        subscriptions {
          name,
          published {
            content
          }
        }
      }
    }`)
      .map(data => data.sub.subscriptions)
      .flatMap((pubs: Publisher[], unused_ix) => Observable.fromArray(pubs))
      .flatMap(
          (pub: Publisher, unused_ix: number) => {
            return Observable.fromArray(pub.published);
          },
          (pub: Publisher, message: Message, unused_pubi: number,
           unused_ci: number) => {
            return {message: message, publisher: pub};
          });
  }

  private _get(query) {
    const query_str = query.replace(/ /g, "");
    return this._http
      .get(this._api + `/graphql?query=query+${query_str}`)
      .map(res => res.json())
      .map(json_res => json_res.data);
  }
}