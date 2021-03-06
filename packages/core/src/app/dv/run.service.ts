import {
  ElementRef, Injectable, Renderer2, RendererFactory2
} from '@angular/core';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';

import { GatewayService } from './gateway.service';

import { NodeUtils } from './node.utils';

import * as assert from 'assert';


// To indicate run failure, return a rejected promise
export type onRun = () => Promise<any> | any;
// res is the value the promise returned in `dvOnExec` or `dvOnEval` resolved to
export type onSuccess = (res?: any, allRes?: RunResultMap) => void;
// reason is the error that caused the failure
export type onFailure = (reason: Error, allReasons?: RunResultMap) => void;

export interface OnExec {
  dvOnExec: onRun;
}

export interface OnExecSuccess {
  dvOnExecSuccess: onSuccess;
}

export interface OnExecFailure {
  dvOnExecFailure: onFailure;
}

export interface OnEval {
  dvOnEval: onRun;
}

export interface OnEvalSuccess {
  dvOnEvalSuccess: onSuccess;
}

export interface OnEvalFailure {
  dvOnEvalFailure: onFailure;
}

interface ComponentInfo {
  component: any;
  node: any;
}

export interface RunResultMap {
  [componentId: string]: any;
}

type RunType = 'eval' | 'exec';

const runFunctionNames = {
  eval: {
    onRun: 'dvOnEval',
    onSuccess: 'dvOnEvalSuccess',
    onFailure: 'dvOnEvalFailure'
  },
  exec: {
    onRun: 'dvOnExec',
    onSuccess: 'dvOnExecSuccess',
    onFailure: 'dvOnExecFailure'
  }
};


@Injectable()
export class RunService {
  private renderer: Renderer2;
  private componentTable: {[id: string]: ComponentInfo} = {};

  constructor(
    rendererFactory: RendererFactory2) {
    // https://github.com/angular/angular/issues/17824
    // It seems like while you can get Renderer2 injected in components it
    // doesn't work for services. The workaround is to get the factory injected
    // and use it to create a renderer.
    // If you pass null null to `createRenderer` it returns the default renderer
    // without creating a new one
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Register a new component. Should be called on init. Only components that
   * can be run are required to be registered.
   */
  register(elem: ElementRef, component: any) {
    const componentId = uuid();
    const node = elem.nativeElement;
    NodeUtils.SetComponentId(node, componentId);
    this.componentTable[componentId] = {component: component, node: node};
  }

  registerAppComponent(elem: ElementRef, component: any) {
    this.register(elem, component);
    NodeUtils.MarkAsAppComponent(elem.nativeElement);
  }

  getComponentInstance(componentId: string): any | null {
    return _.get(this.componentTable[componentId], 'component', null);
  }

  /**
   * Cause the component given by `elem` to execute.
   */
  async exec(elem: ElementRef) {
    this.run('exec', elem);
  }

  /**
   * Cause the component given by `elem` to evaluate.
   */
  async eval(elem: ElementRef) {
    this.run('eval', elem);
  }

  // has to be consistent with the way the gateway service finds nodes.
  private getTargetComponent(initialNode) {
    let pComponent = this.renderer.parentNode(initialNode);
    NodeUtils.WalkUpFromNode(pComponent, this.renderer,
      (node) => {
        if (NodeUtils.IsComponent(node)) {
          pComponent = node;

          return true;
        }

        return false;
      });

    return NodeUtils.IsDvTx(pComponent) ? pComponent : initialNode;
  }

  private async run(runType: RunType, elem: ElementRef) {
    console.log(
      `Running ${runType} request from ` +
      NodeUtils.GetFqTagOfNode(elem.nativeElement));
    const targetComponent = this.getTargetComponent(elem.nativeElement);
    const targetComponentFqTag = NodeUtils.GetFqTagOfNode(targetComponent);
    const runId = NodeUtils.GetRunId(targetComponent);
    if (runId) {
      console.log(
        `Skipping ${runType} (${runId}) since there's already one in ` +
        `progress`);

      return;
    }
    let id;
    if (NodeUtils.IsDvTx(targetComponent)) {
      id = uuid();
      NodeUtils.SetRunId(targetComponent, id);
    }

    console.log(
      `Target component is ${targetComponentFqTag} (${runType}, ${id})`);
    let runResultMap: RunResultMap | undefined;
    try {
      runResultMap = await this.callDvOnRun(runType, targetComponent, id);
    } catch (error) { // shouldn't happen
      throw error;
    }
    const runFailed = _.filter(_.values(runResultMap), _.isError).length > 0;
    if (runFailed) {
      console.error(`Got error on ${runType} ${id} (${targetComponentFqTag})`);
      // Note: you can't use JSON.stringify because errors objects would just
      // output `{}`
      console.error(runResultMap);
      console.log(`Finalizing ${runType} ${id} (${targetComponentFqTag})`);
      this.removeRunIds(targetComponent);
      this.callDvOnRunX('onFailure', runType, targetComponent, runResultMap);
    } else { // no error
      console.log(`Finalizing ${runType} ${id} (${targetComponentFqTag})`);
      this.removeRunIds(targetComponent);
      this.callDvOnRunX('onSuccess', runType, targetComponent, runResultMap);
    }
  }

  /**
   * Walks the dom starting from `node` calling `onComponent` with the component
   * info when a component is encountered. No child of components are traversed.
   */
  private walkComponents(
    node, onComponent: (componentInfo, str?) => void): void {
    const componentId = NodeUtils.GetComponentId(node);
    if (!componentId) {
      // node is not a dv-component (e.g., it's a <div>) or is dv-tx
      _.each(node.childNodes, (n) => this.walkComponents(n, onComponent));

      return;
    }
    const target = this.componentTable[componentId];
    onComponent(target, componentId);
  }

  // returns after all runs finish either successfuly or with an error.
  // The returned promise will never be a rejected promise but it could
  // have run results of type Error.
  private async callDvOnRun(
    runType: RunType, node, id: string | undefined): Promise<RunResultMap> {
    const dvOnRun = runFunctionNames[runType].onRun;
    const runs: Promise<RunResultMap>[] = [];

    // run the component, or each component in tx with the same RUN ID
    this.walkComponents(node, (componentInfo, componentId) => {
      const fqTag = NodeUtils.GetFqTagOfNode(componentInfo.node);
      if (componentInfo.component[dvOnRun]) {
        if (id !== undefined) {
          NodeUtils.SetRunId(componentInfo.node, id);
        }
        console.log(`Calling ${dvOnRun} on ${fqTag}`);
        runs.push(
          Promise
            .resolve(componentInfo.component[dvOnRun]())
            .then((result) => ({[componentId]: result}))
            .catch((e) => {
              console.error(`Error in ${fqTag}: ${e}`);
              // Turn a rejected promise into a succesfull one with an error
              // result
              assert.ok(!_.isNil(e));
              assert.ok(_.isError(e));

              return {[componentId]: e};
            }));
      } else {
        console.log(
          `Skipped calling ${dvOnRun} on ${fqTag}: there's no method`);
      }
    });

    // send the request, if relevant
    if (GatewayService.txBatches[id]) {
      GatewayService.txBatches[id].setNumComponents(runs.length);
    } else if (id) {
      // If no one initialized the tx batch then then we can't mark the
      // num components expected. We have to add it to pending and the gateway
      // is going to set num components for us
      console.log(`Set num comps pending for id ${id} to ${runs.length}`);
      GatewayService.txPendingNumComponents[id] = runs.length;
    }

    const resultMaps: RunResultMap[] = await Promise.all(runs);

    return _.assign({}, ...resultMaps);
  }

  private removeRunIds(node): void {
    NodeUtils.RemoveRunId(node);
    this.walkComponents(node, (componentInfo) => {
      NodeUtils.RemoveRunId(componentInfo.node);
    });
  }

  private callDvOnRunX(
    x: 'onSuccess' | 'onFailure', runType: RunType, node,
    runResultMap: RunResultMap): void {
    const dvOnX = runFunctionNames[runType][x];
    this.walkComponents(node, (componentInfo, componentId) => {
      if (componentInfo.component[dvOnX]) {
        componentInfo.component[dvOnX](
          runResultMap[componentId], runResultMap);
      }
    });
  }
}
