import { strings } from '@angular-devkit/core';
import {
  apply,
  chain,
  filter,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  SchematicsException,
  template,
  Tree,
  url
} from '@angular-devkit/schematics';
import { HTMLElement, parse, TextNode } from 'node-html-parser';
import * as ts from 'typescript';
import {
  appendToArrayDeclaration,
  findNodes,
  insertExport,
  insertImport,
  nodesByPosition
} from '../utils/ast-utils';
import { InsertChange } from '../utils/change';


export function component(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const templateSource = apply(url(`./files/${options.type}`), [
        template({
          ...strings,
          ...options
        }),
        filter((path) => !path.endsWith('.DS_Store') && !tree.exists(path)),
        move(getConceptAppPath(options.conceptName))
    ]);

    return chain([
      mergeWith(templateSource),
      addComponentToMetadata(options),
      addToAppComponentHtml(options)
    ])(tree, _context);
  };
}

function getFileText(tree: Tree, filePath: string): string {
  const text = tree.read(filePath);
  if (text === null) {
    throw new SchematicsException(`File ${filePath} does not exist.`);
  }

  return text.toString('utf-8');
}

function readIntoSourceFile(tree: Tree, filePath: string): ts.SourceFile {
  const sourceText = getFileText(tree, filePath);

  return ts.createSourceFile(
    filePath, sourceText, ts.ScriptTarget.Latest, true);
}

function getConceptAppPath(conceptName: string): string {
  const dasherizedName = strings.dasherize(conceptName);

  return `/src/app/${dasherizedName}`;
}

function getMetadataPath(conceptName: string): string {
  const dasherizedName = strings.dasherize(conceptName);

  return `${getConceptAppPath(conceptName)}/${dasherizedName}.metadata.ts`;
}

function findLastComponentImportExportPos(source: ts.SourceFile) {
  const lastComponentExport = findNodes(source, ts.SyntaxKind.ExportDeclaration)
    .filter((node: ts.ExportDeclaration) =>
      node.exportClause && node.exportClause.elements
      .filter((exportElement) =>
        exportElement
          .getText()
          .match('Component')
      ).length > 0
    )
    .sort(nodesByPosition)
    .pop();

  const lastComponentImport = findNodes(source, ts.SyntaxKind.ImportDeclaration)
    .filter((node: ts.ImportDeclaration) => node.moduleSpecifier &&
      node.moduleSpecifier
        .getText()
        .match('component')
    )
    .sort(nodesByPosition)
    .pop();

  const insertPosByLastExport = lastComponentExport ?
    lastComponentExport.getEnd() : 0;
  const insertPosByLastImport = lastComponentImport ?
    lastComponentImport.getEnd() : 0;

  return Math.max(insertPosByLastExport, insertPosByLastImport);
}

function addComponentToMetadata(options: any): Rule {
  return (tree: Tree) => {
    if (options.skipMetadataImport) {
      return tree;
    }
    const metadataPath = getMetadataPath(options.conceptName);
    const componentPath = `./${strings.dasherize(options.componentName)}/`
                          + strings.dasherize(options.componentName)
                          + '.component';
    const componentName = `${strings.classify(options.componentName)}Component`;
    const source = readIntoSourceFile(tree, metadataPath);

    const changeRecorder = tree.beginUpdate(metadataPath);
    const insertPos = findLastComponentImportExportPos(source);

    const importChange = insertImport(source,
      metadataPath, componentName, componentPath, insertPos);
    if (importChange instanceof InsertChange) {
      changeRecorder.insertLeft(importChange.pos, importChange.toAdd);
    }

    const exportChange = insertExport(
      source, componentName, componentPath, insertPos);
    if (exportChange instanceof InsertChange) {
      changeRecorder.insertLeft(exportChange.pos, exportChange.toAdd);
    }
    tree.commitUpdate(changeRecorder);

    const arrayChangeRecorder = tree.beginUpdate(metadataPath);
    const arrayChange = appendToArrayDeclaration(
      readIntoSourceFile(tree, metadataPath), 'allComponents', componentName);
    if (arrayChange instanceof InsertChange) {
      arrayChangeRecorder.insertLeft(arrayChange.pos, arrayChange.toAdd);
    }
    tree.commitUpdate(arrayChangeRecorder);

    return tree;
  };
}

function addToAppComponentHtml(options: any): Rule {
  return (tree: Tree) => {
    if (options.skipAppComponentHtml) {
      return tree;
    }
    const filePath = '/src/app/app.component.html';

    const root = parse(getFileText(tree, filePath)) as HTMLElement;
    const componentComponentSelector =
      `${options.conceptName}-${strings.dasherize(options.componentName)}`;
    // skip if it's already there
    if (root.querySelector(componentComponentSelector)) {
      return tree;
    }

    const title = `${strings.capitalize(options.type)} ` +
      `${strings.capitalize(options.entityName)}`;
    const componentHtml =
      `  <h2>${title}</h2>\n` +
      `  <${componentComponentSelector}></${componentComponentSelector}>\n`;

    const container = root.querySelector('div.container');
    if (!container) {
      console.log('Could not find div with class container, ' +
        `skipping update to ${filePath}`);

      return tree;
    }

    container.appendChild(new TextNode(componentHtml));
    tree.overwrite(filePath, root.toString());

    return tree;
  };
}
