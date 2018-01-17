import {GraphQlService} from "gql";

import {Widget, Field, Atom, AfterInit, PrimitiveAtom} from "client-bus";



@Widget({fqelement: "Task", ng2_providers: [GraphQlService]})
export class CompleteTaskComponent implements AfterInit {
  @Field("Task") task: Atom;
  @Field("boolean") submit_ok: PrimitiveAtom<boolean>;

  submitted = false;

  constructor(
    private _graphQlService: GraphQlService) {}

  dvAfterInit() {
    this.submit_ok.on_change(() => {
      if (this.task.atom_id) this.markCompleted();
    });
  }

  markCompleted() {
    if (this.submitted) return;

    this._graphQlService
      .post(`
        completeTask(task_id: "${this.task.atom_id}")
      `)
      .subscribe(res => {
        this.submitted = true;
        this.submit_ok.value = !this.submit_ok.value;
      });
  }
}
