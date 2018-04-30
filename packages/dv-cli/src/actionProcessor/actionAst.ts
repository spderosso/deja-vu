import * as posthtml from 'posthtml';

import * as _ from 'lodash';


export type ActionAst = ActionTag[];
export interface ActionTag {
  fqtag: string;
  dvOf?: string;
  dvAlias?: string;
  tag: string;
  inputs?: {[name: string]: string};
  content?: ActionAst;
}

interface TagInfo {
  tag: string;
  attrs?: { [key: string]: string }; // a boolean attr has '' as its value
}

// https://github.com/posthtml/posthtml-parser
type PostHtmlAst = (string | Tag)[];
interface Tag extends TagInfo {
  content: PostHtmlAst;
}

type TagOnlyAst = TagOnly[];
interface TagOnly extends TagInfo {
  content: TagOnlyAst;
}


export function getActionAst(
  projectName: string, usedCliches: ReadonlyArray<string>, html: string)
  : ActionAst {
  const tagsToKeep = new Set([ projectName, ...usedCliches, 'dv' ]);

  return posthtml([
      filterActionTags(tagsToKeep),
      flatten(tagsToKeep),
      buildActionAst(),
    ])
    .process(html, { sync: true })
    .tree;
}

/**
 *  Retain only elements whose tag is in `tagsToKeep` and its parents.
 *
 *  The goal of this pass is to prune the AST, cutting the branches that
 *  include no actions.
 */
function filterActionTags(tagsToKeep: Set<string>) {
  const _filterActionTags = (tree: PostHtmlAst): TagOnlyAst => {
    const ret: TagOnlyAst = _.chain<PostHtmlAst>(tree)
      .map((tag: string | Tag): TagOnly | null => {
        if (_.isString(tag)) {
          return null;
        }
        if (tagsToKeep.has(tag.tag.split('-')[0])) {
          tag.content = _filterActionTags(tag.content);
          // We can't filter attrs to only include those that are not html
          // global attributes because the action could use what would be valid
          // html global attributes as inputs (e.g., `<foo [id]="bar"></foo>`)
        } else {
          tag.attrs = {};
          tag.content = _filterActionTags(tag.content);
          if (_.isEmpty(tag.content)) {
            return null;
          }
        }

        return tag as TagOnly;
      })
      .reject(_.isNull)
      .value();

    return ret;
  };
  return _filterActionTags;
}

/**
 *  Replace non-action elements with its children
 */
function flatten(tagsToKeep: Set<string>) {
  const _flatten = (tree: TagOnlyAst): PostHtmlAst => {
    return _.flatten(_.map(tree, (tag: TagOnly) => {
      if (!tagsToKeep.has(tag.tag.split('-')[0])) {
        return _flatten(tag.content);
      }
      return tag;
    }));
  };
  return _flatten;
}

/**
 * Turn a `PostHtmlAst` consisting only of actions into an `ActionAst`
 * (i.e., enhance the AST with action-specific information)
 */
function buildActionAst() {
  const _buildActionAst = (tree: TagOnlyAst): ActionAst => {
    const ret: ActionTag[] = _.map(tree, (tag: TagOnly): ActionTag => {
      const dvOf = _.get(tag.attrs, 'dvOf');
      const dvAlias = _.get(tag.attrs, 'dvAlias');
      const actionTag: ActionTag = {
        fqtag: getFqTag(tag.tag, dvOf, dvAlias),
        dvOf: dvOf, dvAlias: dvAlias, tag: tag.tag,
        inputs: tag.attrs, content: _buildActionAst(tag.content)
      };

      return _.omitBy(actionTag, _.isEmpty) as ActionTag;
    });

    return ret;
  };

  return _buildActionAst;
}

/**
 *  @returns the fully qualified tag for the given tag
 */
function getFqTag(
  tag: string, dvOf: string | undefined, dvAlias: string | undefined): string {
  if (dvAlias) {
    return dvAlias;
  }
  let [clicheName, ...actionTagName] = tag.split('-');
  if (dvOf) { clicheName = dvOf; }

  return clicheName + '-' + actionTagName.join('-');
}
