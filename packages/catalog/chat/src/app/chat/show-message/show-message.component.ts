import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnChanges,
  OnInit, Output
} from '@angular/core';
import { DvService, DvServiceFactory, OnEval } from '@deja-vu/core';
import { Observable } from 'rxjs/Observable';
import { map, take } from 'rxjs/operators';

import { API_PATH } from '../chat.config';
import { GraphQlMessage, Message, toMessage } from '../shared/chat.model';

interface MessageRes {
  data: { message: GraphQlMessage };
}


@Component({
  selector: 'chat-show-message',
  templateUrl: './show-message.component.html'
})
export class ShowMessageComponent
  implements AfterViewInit, OnChanges, OnEval, OnInit {
  // Provide one of the following: id or message
  @Input() id: string | undefined;
  @Input() message: Message | undefined;
  @Output() loadedMessage = new EventEmitter();

  @Input() showId = true;
  @Input() showContent = true;
  @Input() showTimestamp = true;
  @Input() showAuthorId = true;
  @Input() showChatId = true;

  private dvs: DvService;

  constructor(
    private elem: ElementRef, private dvf: DvServiceFactory,
    @Inject(API_PATH) private apiPath) {}

  ngOnInit() {
    this.dvs = this.dvf.forComponent(this)
      .build();
  }

  ngAfterViewInit() {
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  load() {
    if (this.canEval()) {
      this.dvs.eval();
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      const res = await this.dvs.get<MessageRes>(this.apiPath, {
        params: {
          inputs: {
            id: this.id
          },
          extraInfo: {
            returnFields: `
              ${this.showId ? 'id' : ''}
              ${this.showContent ? 'content' : ''}
              ${this.showTimestamp ? 'timestamp' : ''}
              ${this.showAuthorId ? 'authorId' : ''}
              ${this.showChatId ? 'chatId' : ''}
            `
          }
        }
      });
      if (res.data) {
        const message: Message = toMessage(res.data.message);
        this.message = message;
        this.loadedMessage.emit(message);
      }
    } else if (this.dvs) {
      this.dvs.noRequest();
    }
  }

  private canEval(): boolean {
    return !!(!this.message && this.id && this.dvs);
  }
}
