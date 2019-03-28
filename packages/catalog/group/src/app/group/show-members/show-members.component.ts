import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  Type
} from '@angular/core';
import {
  Action, GatewayService, GatewayServiceFactory, OnEval, RunService
} from '@deja-vu/core';
import * as _ from 'lodash';

import { ShowMemberComponent } from '../show-member/show-member.component';


@Component({
  selector: 'group-show-members',
  templateUrl: './show-members.component.html',
  styleUrls: ['./show-members.component.css']
})
export class ShowMembersComponent implements AfterViewInit, OnEval, OnInit,
  OnChanges {
  // Fetch rules
  @Input() inGroupId: string | undefined;

  // Presentation rules
  @Input() noMembersText = 'No members';

  @Input() showMember: Action = {
    type: <Type<Component>> ShowMemberComponent
  };

  @Output() loadedMemberIds = new EventEmitter<string[]>();

  memberIds: string[] = [];

  showMembers;
  private gs: GatewayService;

  constructor(
    private elem: ElementRef, private gsf: GatewayServiceFactory,
    private rs: RunService) {
    this.showMembers = this;
  }

  ngOnInit() {
    this.gs = this.gsf.for(this.elem);
    this.rs.register(this.elem, this);
  }

  ngAfterViewInit() {
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  load() {
    if (this.canEval()) {
      this.rs.eval(this.elem);
    }
  }

  async dvOnEval(): Promise<void> {
    if (this.canEval()) {
      this.gs
        .get<{ data: { members: string[] } }>('/graphql', {
          params: {
            inputs: JSON.stringify({
              input: {
                inGroupId: this.inGroupId
              }
            })
          }
        })
        .subscribe((res) => {
          this.memberIds = res.data.members;
          this.loadedMemberIds.emit(this.memberIds);
        });
    }
  }

  private canEval(): boolean {
    return !!(this.gs);
  }
}
