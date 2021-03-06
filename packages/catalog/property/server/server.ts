import {
  Collection,
  ComponentRequestTable,
  ConceptDb,
  ConceptServer,
  ConceptServerBuilder,
  Context,
  EMPTY_CONTEXT,
  getReturnFields
} from '@deja-vu/concept-server';
import * as Ajv from 'ajv';
import { IResolvers } from 'graphql-tools';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import {
  jsonSchemaTypedEnumFilterToGraphQlFilter,
  jsonSchemaTypeToGraphQlFilterType,
  jsonSchemaTypeToGraphQlType,
  PropertyConfig
} from './config-types';
import { ObjectDoc } from './schema';

const loadSchemaQuery = (extraInfo) => `
  query Properties {
    properties ${getReturnFields(extraInfo)}
  }
`;
const loadSchemaAndObjectsQueries = (extraInfo) => {
  switch (extraInfo.action) {
    case 'properties':
      return loadSchemaQuery(extraInfo);
    case 'objects':
      return `
        query Objects {
          objects ${getReturnFields(extraInfo)}
        }
      `;
    default:
      throw new Error('Need to specify extraInfo.action');
  }
};


const componentRequestTable: ComponentRequestTable = {
  'choose-object': (extraInfo) => loadSchemaAndObjectsQueries(extraInfo),
  'create-object': (extraInfo) => {
    switch (extraInfo.action) {
      case 'schema':
        return loadSchemaQuery(extraInfo);
      case 'create':
        return `
          mutation CreateObject($input: CreateObjectInput!) {
            createObject(input: $input) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('Need to specify extraInfo.action');
    }
  },
  'create-objects': (extraInfo) => {
    switch (extraInfo.action) {
      case 'schema':
        return loadSchemaQuery(extraInfo);
      case 'create':
        return `
          mutation CreateObjects($input: [CreateObjectInput!]) {
            createObjects(input: $input) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('Need to specify extraInfo.action');
    }
  },
  'create-property': (extraInfo) => `
    query Property($name: String!) {
      property(name: $name) ${getReturnFields(extraInfo)}
    }
  `,
  'filter-objects': (extraInfo) => `
    query FilteredObjects($filters: FilterInput) {
      filteredObjects(filters: $filters) ${getReturnFields(extraInfo)},
    }
  `,
  'object-autocomplete': (extraInfo) => loadSchemaAndObjectsQueries(extraInfo),
  'delete-object': (extraInfo) => `
    mutation DeleteObject($id: ID!) {
      deleteObject(id: $id) ${getReturnFields(extraInfo)}
    }
  `,
  'show-object': (extraInfo) => {
    switch (extraInfo.action) {
      case 'properties':
        return loadSchemaQuery(extraInfo);
      case 'object':
        return `
          query ShowObject($id: ID!) {
            object(id: $id) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('Need to specify extraInfo.action');
    }
  },
  'show-objects': (extraInfo) => {
    switch (extraInfo.action) {
      case 'properties':
        return loadSchemaQuery(extraInfo);
      case 'objects':
        return `
          query ShowObjects($fields: FieldMatchingInput) {
            objects(fields: $fields) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('Need to specify extraInfo.action');
    }
  },
  'update-object': (extraInfo) => {
    switch (extraInfo.action) {
      case 'update':
        return `
          mutation UpdateObject($input: UpdateObjectInput!) {
            updateObject(input: $input) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('extraInfo.action can only be update');
    }
  },
  'update-objects': (extraInfo) => {
    switch (extraInfo.action) {
      case 'update':
        return `
          mutation UpdateObjects($input: [UpdateObjectInput!]) {
            updateObjects(input: $input) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('extraInfo.action can only be update');
    }
  },
  'verify-object-matches': (extraInfo) => `
    query VerifyObjectMatches($fields: VerifyObjectMatchesInput!) {
      verifyObjectMatches(fields: $fields) ${getReturnFields(extraInfo)}
    }
  `
};

function getDynamicTypeDefs(config: PropertyConfig): string[] {
  const requiredProperties: Set<string> = new Set(config.schema.required);
  const properties = _
    .chain(config.schema.properties)
    .toPairs()
    .map(([propertyName, schemaPropertyObject]) => {
      return `${propertyName}: ` +
        jsonSchemaTypeToGraphQlType[schemaPropertyObject.type] +
        (requiredProperties.has(propertyName) ? '!' : '');
    })
    .value();
  const joinedProperties = properties.join('\n');

  // Similar as properties, but it doesn't mark any field as required
  // this is used for filter (where not all fields are required)
  const nonRequiredProperties = _
    .chain(config.schema.properties)
    .toPairs()
    .map(([propertyName, schemaPropertyObject]) => {
      return `${propertyName}: ` +
        jsonSchemaTypeToGraphQlType[schemaPropertyObject.type];
    })
    .value();

  const joinedNonRequiredProperties = nonRequiredProperties.join('\n');

  const fieldMatchingProperties = _
    .chain(config.schema.properties)
    .toPairs()
    .map(([propertyName, _schemaPropertyObject]) => {

      return `${propertyName}: String`;
    })
    .value();

  const joinedFieldMatchingProperties = fieldMatchingProperties.join('\n');

  const propertyFilters = _
    .chain(config.schema.properties)
    .toPairs()
    .filter(([_propertyName, schemaPropertyObject]) => (
      schemaPropertyObject.type === 'boolean' ||
      schemaPropertyObject.type === 'integer' ||
      schemaPropertyObject.type === 'number' ||
      !!schemaPropertyObject.enum
    ))
    .map(([propertyName, schemaPropertyObject]) => (
      `${propertyName}: ` +
        (schemaPropertyObject.enum ?
        jsonSchemaTypedEnumFilterToGraphQlFilter[schemaPropertyObject.type] :
        jsonSchemaTypeToGraphQlFilterType[schemaPropertyObject.type])
    ))
    .value();
  const joinedPropertyFilters = propertyFilters.join('\n');

  return [`
    type Object {
      id: ID!
      timestamp: Float!
      ${joinedProperties}
    }

    input CreateObjectInput {
      id: ID
      ${joinedProperties}
    }

    input UpdateObjectInput {
      id: ID!
      ${joinedNonRequiredProperties}
    }

    input FieldMatchingInput {
      id: ID
      ${joinedFieldMatchingProperties}
    }

    input VerifyObjectMatchesInput {
      id: ID
      ${joinedFieldMatchingProperties}
    }

    input FilterInput {
      # filtering by id is currently not implemented
      # the id field is included to prevent having an empty type
      id: ID
      ${joinedPropertyFilters}
    }
  `];
}

function createObjectFromInput(config: PropertyConfig, input) {
  const newObject = _.omitBy(_.cloneDeep(input), _.isNil);
  newObject.id = input.id ? input.id : uuid();
  const ajv = new Ajv();
  const validate = ajv.compile(config.schema);
  const valid = validate(_.omit(newObject, 'id'));
  if (!valid) {
    throw new Error(_.map(validate.errors, 'message')
      .join('\n'));
  }

  return newObject;
}

function addTimestamp(obj: ObjectDoc) {
  obj.timestamp = new Date(obj._id.getTimestamp())
    .getTime();

  return obj;
}

function fieldsInputToQuery(fields) {
  const query = _.mapValues(fields, (v) => {
    if (!_.isString(v)) {
      return v;
    }
    let qObj;
    try {
      qObj = JSON.parse(v);
    } catch (e) {
      return v;
    }

    return _.mapKeys(qObj, (_v, k: string) => k.startsWith('q_') ?
      '$' + k.slice(2) : k);
  });

  return query;
}

function resolvers(db: ConceptDb, config: PropertyConfig): IResolvers {
  const objects: Collection<ObjectDoc> = db.collection('objects');
  const resolversObj = {
    Query: {
      property: (_root, { name }) => {
        const propertyInfo = config.schema.properties[name];

        return {
          name: name,
          schema: JSON.stringify(propertyInfo),
          required: _.includes(config.schema.required, name)
        };
      },

      object: async (_root, { id }) => {
        const obj: ObjectDoc | null = await objects.findOne({ id: id });

        return _.get(obj, '_pending') ? null : addTimestamp(obj);
      },

      objects: async (_root, { fields }) => {
        const query = fieldsInputToQuery(fields);
        const objsCursor = await objects.findCursor(query);
        const objs = await objsCursor
          .sort({ _id: -1 })
          .toArray();

        return _.map(objs, addTimestamp);
      },

      filteredObjects: async (_root, { filters } ) => {
        // it serves two purposes:
        // (1) get rid of null fields
        // (2) turn yes/no logic into yes/don't care logic for booleans
        const filteredFilters = _.pickBy(filters, (value) => !!value);

        const modifiedFilters = _.mapValues(filteredFilters,
          (filter) => {
          if (typeof filter === 'boolean') {
            return filter;
          } else if (filter.matchValues) {
            return { $in: filter.matchValues };
          } else {
            return {
              $gte: filter.minValue,
              $lte: filter.maxValue
            };
          }
        });

        const objsCursor = await objects.findCursor(modifiedFilters);
        const objs = await objsCursor
          .sort({ _id: -1 })
          .toArray();

        return _.map(objs, addTimestamp);
      },

      properties: (_root) => _
        .chain(config['schema'].properties)
        .toPairs()
        .map(([ name, propertyInfo ]) => ({
          name: name,
          schema: JSON.stringify(propertyInfo),
          required: _.includes(config.schema.required, name)
        }))
        .value(),

      verifyObjectMatches: async (_root, { fields }) => {
        const query = fieldsInputToQuery(fields);
        await objects.findOne(query);

        return true;
      }
    },
    Property: {
      name: (root) => root.name,
      schema: (root) => root.schema,
      required: (root) => root.required
    },
    Mutation: {
      createObject: async (_root, { input }, context: Context) => {
        const newObject: ObjectDoc = createObjectFromInput(config, input);

        return await objects.insertOne(context, newObject);
      },

      createObjects: async (_root, { input }, context: Context) => {
        const objDocs: ObjectDoc[] = _.map(
          input, (i) => createObjectFromInput(config, i));

        // if one insertion fails:
        //  the remaining elements will not be inserted
        //  the elements inserted before will remain inserted
        return objDocs[0] ? await objects.insertMany(context, objDocs) : [];
      },

      deleteObject: async (_root, { id }, context: Context) => {
        return await objects.deleteOne(context, { id: id });
      },

      updateObject: async (_root, { input }, context: Context) => {
        const newObject: ObjectDoc = createObjectFromInput(config, input);

        return await objects.updateOne(context, { id: input.id },
          { $set: newObject }, { upsert: true });
      },

      updateObjects: async (_root, { input }, context: Context) => {
        const newObjects: ObjectDoc[] = _.map(input,
          (value) => createObjectFromInput(config, value));

        // TODO: use bulkWrite
        // instead of updating one by one, we should use BulkWrite
        return await Promise.all(newObjects.map(
          (object) => objects.updateOne(context, {id: object.id},
          {$set: object}, {upsert: false})
          )
        );
      }
    }
  };
  const objectResolvers = {
    id: (obj) => obj.id
  };
  for (const propertyName of _.keys(config.schema.properties)) {
    objectResolvers[propertyName] = (obj) => obj[propertyName];
  }
  resolversObj['Object'] = objectResolvers;

  return resolversObj;
}

const propertyConcept: ConceptServer<PropertyConfig> =
  new ConceptServerBuilder<PropertyConfig>('property')
    .initDb(async (db: ConceptDb, config: PropertyConfig): Promise<any> => {
      const objects: Collection<ObjectDoc> = db.collection('objects');
      await objects.createIndex({ id: 1 }, { unique: true, sparse: true });
      if (!_.isEmpty(config.initialObjects)) {
        return objects.insertMany(EMPTY_CONTEXT,
          _.map(config.initialObjects, (obj) => {
            obj['id'] = obj['id'] ? obj['id'] : uuid();

            return obj;
          })
        );
      }

      return Promise.resolve();
    })
    .componentRequestTable(componentRequestTable)
    .resolvers(resolvers)
    .dynamicTypeDefs(getDynamicTypeDefs)
    .build();

propertyConcept.start();
