import { ComponentSymbolTable, ClicheStEntry } from '../../symbolTable';

import * as _ from 'lodash';
import { NAV_SPLIT_REGEX } from './shared';


export function saveUsedComponents(symbolTable: ComponentSymbolTable) {
  return {
    Element: (element) => element.saveUsedComponents(),
    NormalElement: (startTag, content, _endTag) => {
      startTag.saveUsedComponents();
      content.saveUsedComponents();
    },
    VoidElement: (_open, elementName, _attributes, _close) =>
      elementName.saveUsedComponents(),
    StartTag: (_open, elementName, _attributes, _close) =>
      elementName.saveUsedComponents(),
    ElementName_component: (componentNameMaybeAlias) =>
      componentNameMaybeAlias.saveUsedComponents(),
    ElementName_html: (_name) => { }, Content_text: (_text) => { },
    Content_element: (element) => element.saveUsedComponents(),
    Content_interpolation: (_interpolation) => {},
    ComponentNameMaybeAlias: (componentNameNode, maybeAliasNode) => {
      const maybeAlias = maybeAliasNode.saveUsedComponents();
      if (!_.isEmpty(maybeAlias)) {
        const [ clicheName, componentName ] = _
          .split(componentNameNode.sourceString, NAV_SPLIT_REGEX);
        symbolTable[maybeAlias] = {
          kind: 'component',
          of: clicheName,
          componentName: componentName
        };
      } else {
        componentNameNode.saveUsedComponents();
      }
    },
    Alias: (_as, alias) => alias.sourceString,
    componentName: (clicheAliasNode, _dot, componentNameNode) => {
      const clicheAlias = clicheAliasNode.sourceString;
      const componentName = componentNameNode.sourceString;
      if (!_.has(symbolTable, clicheAlias)) {
        symbolTable[clicheAlias] = { kind: 'cliche' };
      }
      const clicheEntry = <ClicheStEntry> symbolTable[clicheAlias];
      _.set(clicheEntry, `symbolTable.${componentName}`, {
        kind: 'component',
        of: clicheAlias,
        componentName: componentName
      });
    }
  };
}
