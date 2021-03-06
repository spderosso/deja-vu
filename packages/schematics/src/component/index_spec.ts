import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';


const collectionPath = path.join(__dirname, '../collection.json');
const componentName = 'test component';
const dasherizedComponentName = 'test-component';
const conceptName = 'conceptname';

describe('component', () => {
  it('works', () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = runner.runSchematic(
      'component', {
        componentName,
        conceptName,
        skipAppComponentHtml: true,
        skipMetadataImport: true
      }, Tree.empty());

    const componentFilePathPrefix =
      `/src/app/${conceptName}/${dasherizedComponentName}` +
      `/${dasherizedComponentName}`;

    expect(tree.files)
      .toEqual([
        `${componentFilePathPrefix}.component.css`,
        `${componentFilePathPrefix}.component.html`,
        `${componentFilePathPrefix}.component.spec.ts`,
        `${componentFilePathPrefix}.component.ts`
      ]);
  });
});
