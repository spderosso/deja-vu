import { DatePipe } from '@angular/common';
import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnChanges,
  OnInit, Output
} from '@angular/core';
import {
  GatewayService, GatewayServiceFactory, OnEval, RunService
} from '@deja-vu/core';

import { API_PATH } from '../comment.config';
import { Comment } from '../shared/comment.model';

@Component({
  selector: 'comment-show-comment',
  templateUrl: './show-comment.component.html',
  providers: [DatePipe]
})
export class ShowCommentComponent implements OnInit, AfterViewInit, OnChanges,
  OnEval {
  // Provide one of the following: id, (authorId and targetId) or comment
  @Input() id: string | undefined;
  @Input() authorId: string | undefined;
  @Input() targetId: string | undefined;
  @Input() comment: Comment | undefined;

  @Input() showId = true;
  @Input() showAuthorId = true;
  @Input() showTargetId = true;
  @Input() showContent = true;

  @Output() loadedComment = new EventEmitter<Comment>();

  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService, @Inject(API_PATH) private apiPath) { }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  ngAfterViewInit() {
    this.loadComment();
  }

  ngOnChanges() {
    this.loadComment();
  }

  loadComment() {
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {

      if (this.id) {
        this.gs.get<{ data: { comment: Comment } }>(this.apiPath, {
          params: {
            inputs: { id: this.id },
            extraInfo: {
              action: 'comment-by-id',
              returnFields: `
                ${this.showId ? 'id' : ''}
                ${this.showContent ? 'content' : ''}
                ${this.showAuthorId ? 'authorId' : ''}
                ${this.showTargetId ? 'targetId' : ''}
              `
            }
          }
        })
          .subscribe((res) => {
            this.comment = res.data.comment;
          });
      } else if (this.authorId && this.targetId) {
        this.gs.get<{ data: { commentByAuthorTarget: Comment } }>(this.apiPath,
          {
            params: {
              inputs: {
                input: {
                  byAuthorId: this.authorId,
                  ofTargetId: this.targetId
                }
              },
              extraInfo: {
                action: 'comment-by-author',
                returnFields: `
                ${this.showId ? 'id' : ''}
                ${this.showContent ? 'content' : ''}
                ${this.showAuthorId ? 'authorId' : ''}
                ${this.showTargetId ? 'targetId' : ''}
              `
              }
            }
          })
          .subscribe((res) => {
            this.comment = res.data.commentByAuthorTarget;
            this.loadedComment.emit(this.comment);
          });
      }
    } else if (this.gs) {
      this.gs.noRequest();
    }
  }

  private canEval(): boolean {
    return !!(this.gs && !this.comment && (this.id ||
      (this.authorId && this.targetId)));
  }
}
