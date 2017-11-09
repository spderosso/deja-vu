import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import { Project } from '../models/project/project';
import { ClicheMap } from '../models/cliche/cliche';
import { Widget } from '../models/widget/widget';

@Injectable()
export class ProjectService {
  private selectedProject: Project;
  
  public updateProject(project: Project) {
    this.selectedProject = project;
  }

  public getProject(): Project {
    return this.selectedProject;
  }

  public deleteProject() {
    this.selectedProject = undefined;
  }
  
  allCliches = new ReplaySubject<ClicheMap>(1);
  selectedWidget = new ReplaySubject<Widget>(1);

  updateClicheMap(updatedClicheMap: ClicheMap) {
    this.allCliches.next(updatedClicheMap);
  }

  updateSelectedWidget(newSelectedWidget: Widget) {
    this.selectedWidget.next(newSelectedWidget);
  }
}
