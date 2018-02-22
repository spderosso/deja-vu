import { GraphQlService } from "gql";

import { Observable } from "rxjs/Observable";
import "rxjs/add/observable/from";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";

import { Widget, ClientBus, Field, Atom, AfterInit } from "client-bus";
import { TaskAtom } from "../shared/data";

@Widget({ fqelement: "Task", ng2_providers: [GraphQlService] })
export class ShowAssignedTasksComponent implements AfterInit {
  @Field("Assigner") assigner: Atom;

  assignedTasks = [];
  private fetched: string;

  constructor(
    private _graphQlService: GraphQlService, private _clientBus: ClientBus) { }

  dvAfterInit() {
    if (this.assigner.atom_id) {
      this.fetch();
    }
    this.assigner.on_change(() => this.fetch());
  }

  private fetch() {
    if (this.fetched !== this.assigner.atom_id) {
      this.fetched = this.assigner.atom_id;

      if (this.assigner.atom_id) {
        this._graphQlService
          .get(`
          assignedTasks(assigner_id: "${this.assigner.atom_id}"){
            name, atom_id, assignee{atom_id}, expiration_date
          }
        `)
          .map(data => data.assignedTasks)
          .flatMap((tasks, unused_ix) => Observable.from(tasks))
          .map((task: TaskAtom) => {
            const task_atom = this._clientBus.new_atom<TaskAtom>("Task");
            task_atom.atom_id = task.atom_id;
            task_atom.name = task.name;

            task_atom.assigner = this._clientBus.new_atom<Atom>("Assigner");
            task_atom.assigner.atom_id = this.assigner.atom_id;

            task_atom.assignee = this._clientBus.new_atom<Atom>("Assignee");
            task_atom.assignee.atom_id = task.assignee.atom_id;

            task_atom.expiration_date = task.expiration_date;
            return task_atom;
          })
          .subscribe(task => {
            this.assignedTasks.push(task);
          });
      }
    }
  }
}
