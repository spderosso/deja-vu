import * as _ from 'lodash';

export interface NgField {
  name: string;
  value?: any;
}

export interface NgOutput {
  name: string;
  expr: string;
}

interface NgOutputWithInfo extends NgOutput {
  usedFields: string[];
}

/**
 * Builder for Angular components
 */
export class NgComponentBuilder {
  private inputs: string[] = [];
  private outputs: NgOutput[] = [];
  private fields: NgField[] = [];
  private componentImportStatements: string[] = [];
  private style = '';

  constructor(
    private readonly templateUrl: string,
    private readonly className: string,
    private readonly selector: string) {}

  addInputs(inputs: string[]): NgComponentBuilder {
    this.inputs.push(...inputs);

    return this;
  }

  addOutputs(outputs: NgOutput[]): NgComponentBuilder {
    this.outputs.push(...outputs);

    return this;
  }

  addFields(fields: NgField[]): NgComponentBuilder {
    this.fields.push(...fields);

    return this;
  }

  withComponentImports(
    componentImports: { componentName: string, className: string }[])
    : NgComponentBuilder {
    for (const componentImport of componentImports) {
      this.withComponentImport(
        componentImport.componentName, componentImport.className);
    }

    return this;
  }

  withComponentImport(componentName: string, className: string)
    : NgComponentBuilder {
    const from = `../${componentName}/${componentName}.component`;
    this.componentImportStatements
      .push(`import { ${className} } from '${from}'`);

    return this;
  }

  withStyle(style: string): NgComponentBuilder {
    this.style = style;

    return this;
  }

  build(isPage?: boolean): string {
    const outputFields = _.map(
      this.outputs, (output: NgOutput) =>
        `@Output() ${output.name} = new EventEmitter();`);

    const outputsWithInfo: NgOutputWithInfo[] = _.map(this.outputs,
      (o: NgOutput): NgOutputWithInfo => {
        const usedFields = _
          .chain(this.fields)
          .map('name')
          .concat(this.inputs)
          .filter((f: string) =>
            o.expr.match(new RegExp(`\\b${f}\\b`)) !== null)
          .value();

        return {
          name: o.name,
          expr: o.expr,
          usedFields: usedFields
        };
      });
    const usedFieldToOutputInfo = _.reduce(outputsWithInfo, (acc, o) => {
      for (const usedField of o.usedFields) {
        if (_.has(acc, usedField)) {
          acc[usedField].push(o);
        } else {
          acc[usedField] = [ o ];
        }
      }

      return acc;
    }, {});

    const allUsedFields: Set<string> = new Set(_.keys(usedFieldToOutputInfo));
    const inputFields = _.map(this.inputs, (input: string) =>
      `@Input() ${input};`);
    const inputParams = _.map(this.inputs, (input: string) =>
      `this.${input} = JSON.parse(params.get('${input}'));`);

    const fields = _.map(this.fields, (field: NgField) =>
      ((allUsedFields.has(field.name) ?
        `private _${field.name}` :
        field.name) +
      ((field.value) ?
        ` = ${JSON.stringify(field.value)
                .slice(1, -1)};` :
        ';')));
    const componentImports = _.join(this.componentImportStatements, '\n');
    const noInputs = _.isEmpty(inputFields);
    this.style = this.style || '';

    return `
      import { Component, ElementRef, OnInit } from '@angular/core';
      ${noInputs ? '' : 'import { Input } from \'@angular/core\';'}
      ${!isPage || noInputs ? '' :
      'import { ActivatedRoute } from \'@angular/router\';'}
      ${_.isEmpty(outputFields) ?
        '' : 'import { Output, EventEmitter } from \'@angular/core\';'}
      ${componentImports}
      import { RunService } from \'@deja-vu/core\';

      @Component({
        selector: "${this.selector}",
        templateUrl: "${this.templateUrl}",
        styles: [\`${this.style}\`]
      })
      export class ${this.className} implements OnInit {
        ${outputFields.join('\n  ')}
        ${inputFields.join('\n  ')}
        ${fields.join('\n  ')}

        constructor(
           ${!isPage || noInputs ? '' : 'private __dv__route: ActivatedRoute, '}
           private __dv__elem: ElementRef, private __dv__rs: RunService) {}

        ngOnInit() {
          this.__dv__rs.registerAppComponent(this.__dv__elem, this);
          ${!isPage || noInputs ? '' :
          `this.__dv__route.queryParamMap.subscribe(params => {
            ${inputParams.join('\n  ')}
          });`}
        }

        ${[...allUsedFields].map((usedField: string) => `
        get ${usedField}() {
          return this._${usedField};
        }

        set ${usedField}(value) {
          ${[...usedFieldToOutputInfo[usedField]]
             .map((o: NgOutputWithInfo) =>
               `this.${o.name}.emit(${
               this.toEmitExpr(usedField, o.expr, _
                 .map(this.fields, 'name')
                 .concat(this.inputs))});`)
             .join('\n')}
          this._${usedField} = value;
        }
        `)
      .join('\n')}
      }
    `;
  }

  private toEmitExpr(usedField: string, expr: string, allNgFields: string[]) {
    let emitExpr = expr
      .replace(new RegExp(usedField, 'g'), 'value');
    for (const usedNgField of allNgFields) {
      emitExpr = emitExpr.replace(usedNgField, `this.${usedNgField}`);
    }

    return emitExpr;
  }
}
