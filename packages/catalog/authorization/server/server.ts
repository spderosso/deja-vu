import {
  ClicheServer,
  ClicheServerBuilder,
  CONCURRENT_UPDATE_ERROR,
  Config,
  Context,
  InitResolversFn,
  Validation
} from 'cliche-server';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as path from 'path';
import {
  AddViewerToResourceInput,
  CreateResourceInput,
  PendingDoc,
  PrincipalResourceInput,
  ResourceDoc,
  ResourcesInput
} from './schema';
import { v4 as uuid } from 'uuid';


class ResourceValidation {
  static async resourceExistsOrFail(resources: mongodb.Collection<ResourceDoc>,
    id: string): Promise<ResourceDoc> {
    return Validation.existsOrFail(resources, id, 'Resource');
  }
}

async function isOwner(resources: mongodb.Collection<ResourceDoc>,
  principalId: string, resourceId: string): Promise<boolean> {
  const res = await resources
    .findOne({ id: resourceId, ownerId: principalId },
      { projection: { _id: 1 } });

  return !_.isNil(res);
}

function isPendingCreate(doc: ResourceDoc | null) {
  return _.get(doc, 'pending.type') === 'create-resource';
}

const resolvers: InitResolversFn = (db: mongodb.Db, config: Config): object => {
  const resources: mongodb.Collection<ResourceDoc> = db.collection('resources');
  return {
    Query: {
      resources: (root, { input }: { input: ResourcesInput }) => resources
        .find({ viewerIds: input.viewableBy, pending: { $exists: false } })
        .toArray(),

      resource: async (root, { id }) => {
        const resource: ResourceDoc | null = await Validation
          .resourceExistsOrFail(id);
        if (_.isNil(resource) || isPendingCreate(resource)) {
          throw new Error(`Resource ${id} not found`);
        }

        return resource;
      },

      owner: async (root, { resourceId }) => {
        const resource = await resources
          .findOne({ id: resourceId }, { projection: { ownerId: 1 } });

        if (_.isNil(resource) || isPendingCreate(resource)) {
          throw new Error(`Resource ${resourceId} not found`);
        }

        return resource!.ownerId;
      },

      canView: async (root, { input }: { input: PrincipalResourceInput }) => {
        const resource = await resources
          .findOne({ id: input.resourceId, viewerIds: input.principalId },
            { projection: { _id: 1 } });

        if (isPendingCreate(resource)) {
          return null;
        }

        return !_.isNil(resource);
      },

      canEdit: async (root, { input }: { input: PrincipalResourceInput }) => {
        const resource = await resources
          .findOne({ id: input.resourceId, ownerId: input.principalId },
            { projection: { _id: 1 } });

        if (isPendingCreate(resource)) {
          return null;
        }

        return !_.isNil(resource);
      }
    },

    Resource: {
      id: (resource: ResourceDoc) => resource.id,

      ownerId: (resource: ResourceDoc) => resource.ownerId,

      viewerIds: (resource: ResourceDoc) => resource.viewerIds
    },

    Mutation: {
      createResource: async (
        root, { input }: { input: CreateResourceInput }, context: Context) => {
        const newResource: ResourceDoc = {
          id: input.id ? input.id : uuid(),
          ownerId: input.ownerId,
          viewerIds: _.union(_.get(input, 'viewerIds', []), [input.ownerId])
        };

        const reqIdPendingFilter = { 'pending.reqId': context.reqId };
        switch (context.reqType) {
          case 'vote':
            newResource.pending = {
              reqId: context.reqId,
              type: 'create-resource'
            };
          /* falls through */
          case undefined:
            await resources.insertOne(newResource);

            return newResource;
          case 'commit':
            await resources.updateOne(
              reqIdPendingFilter,
              { $unset: { pending: '' } });

            return;
          case 'abort':
            await resources.deleteOne(reqIdPendingFilter);

            return;
        }

        return newResource;
      },

      addViewerToResource: async (
        root,
        { input }: { input: AddViewerToResourceInput }, context: Context) => {
        const updateOp = { $push: { viewerIds: input.viewerId } };
        const notPendingResourceFilter = {
          id: input.id,
          pending: { $exists: false }
        };
        const reqIdPendingFilter = { 'pending.reqId': context.reqId };

        switch (context.reqType) {
          case 'vote':
            await ResourceValidation.resourceExistsOrFail(resources, input.id);
            const pendingUpdateObj = await resources
              .updateOne(
                notPendingResourceFilter,
                {
                  $set: {
                    pending: {
                      reqId: context.reqId,
                      type: 'add-viewer-to-resource'
                    }
                  }
                });
            if (pendingUpdateObj.matchedCount === 0) {
              throw new Error(CONCURRENT_UPDATE_ERROR);
            }

            return true;
          case undefined:
            await ResourceValidation.resourceExistsOrFail(resources, input.id);
            const updateObj = await resources
              .updateOne(notPendingResourceFilter, updateOp);
            if (updateObj.matchedCount === 0) {
              throw new Error(CONCURRENT_UPDATE_ERROR);
            }

            return true;
          case 'commit':
            await resources.updateOne(
              reqIdPendingFilter,
              { ...updateOp, $unset: { pending: '' } });

            return;
          case 'abort':
            await resources.updateOne(
              reqIdPendingFilter, { $unset: { pending: '' } });

            return;
        }

        return;
      },

      deleteResource: async (root, { id }, context: Context) => {
        const notPendingResourceFilter = {
          id: id,
          pending: { $exists: false }
        };
        const reqIdPendingFilter = { 'pending.reqId': context.reqId };

        switch (context.reqType) {
          case 'vote':
            await ResourceValidation.resourceExistsOrFail(resources, id);
            const pendingUpdateObj = await resources.updateOne(
              notPendingResourceFilter,
              {
                $set: {
                  pending: {
                    reqId: context.reqId,
                    type: 'delete-resource'
                  }
                }
              });

            if (pendingUpdateObj.matchedCount === 0) {
              throw new Error(CONCURRENT_UPDATE_ERROR);
            }

            return true;
          case undefined:
            await ResourceValidation.resourceExistsOrFail(resources, id);
            const res = await resources
              .deleteOne({ id: id, pending: { $exists: false } });

            if (res.deletedCount === 0) {
              throw new Error(CONCURRENT_UPDATE_ERROR);
            }

            return true;
          case 'commit':
            await resources.deleteOne(reqIdPendingFilter);

            return;
          case 'abort':
            await resources.updateOne(
              reqIdPendingFilter, { $unset: { pending: '' } });

            return;
        }

        return;
      }
    }
  };
};

const authorizationCliche: ClicheServer =
  new ClicheServerBuilder('authorization')
    .initDb((db: mongodb.Db, config: Config): Promise<any> => {
      const resources: mongodb.Collection<ResourceDoc> =
        db.collection('resources');
      return Promise.all([
        resources.createIndex({ id: 1 }, { unique: true }),
        resources.createIndex({ id: 1, viewerIds: 1 }, { unique: true }),
        resources.createIndex({ id: 1, ownerId: 1 }, { unique: true })
      ]);
    })
    .resolvers(resolvers)
    .build();

authorizationCliche.start();
