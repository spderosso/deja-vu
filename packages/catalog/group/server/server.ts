import {
  ClicheServer,
  ClicheServerBuilder,
  CONCURRENT_UPDATE_ERROR,
  Config,
  Context,
  Validation
} from 'cliche-server';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import {
  CreateGroupInput,
  GroupDoc,
  GroupsInput,
  MembersInput
} from './schema';
import { v4 as uuid } from 'uuid';


class GroupValidation {
  static async groupExistsOrFail(
    groups: mongodb.Collection<GroupDoc>, id: string): Promise<GroupDoc> {
    return Validation.existsOrFail(groups, id, 'Group');
  }
}

function isPendingCreate(group: GroupDoc | null) {
  return _.get(group, 'pending.type') === 'create-group';
}

async function addOrRemoveMember(
  groups: mongodb.Collection<GroupDoc>, groupId: string, memberId: string,
  updateType: 'add-member' | 'remove-member', context: Context)
  : Promise<Boolean> {
  const operation = updateType === 'add-member' ? '$addToSet' : '$pull';
  const updateOp = { [operation]: { memberIds: memberId } };

  const notPendingGroupFilter = {
    id: groupId,
    pending: { $exists: false }
  };
  const reqIdPendingFilter = { 'pending.reqId': context.reqId };
  switch (context.reqType) {
    case 'vote':
      await GroupValidation.groupExistsOrFail(groups, groupId);
      const pendingUpdateObj = await groups.updateOne(
        notPendingGroupFilter,
        {
          $set: {
            pending: {
              reqId: context.reqId,
              type: updateType
            }
          }
        });
      if (pendingUpdateObj.matchedCount === 0) {
        throw new Error(CONCURRENT_UPDATE_ERROR);
      }

      return true;
    case undefined:
      await GroupValidation.groupExistsOrFail(groups, groupId);
      const updateObj = await groups.updateOne(notPendingGroupFilter, updateOp);
      if (updateObj.matchedCount === 0) {
        throw new Error(CONCURRENT_UPDATE_ERROR);
      }

      return true;
    case 'commit':
      await groups.updateOne(
        reqIdPendingFilter,
        { ...updateOp, $unset: { pending: '' } });

      return false;
    case 'abort':
      await groups.updateOne(reqIdPendingFilter, { $unset: { pending: '' } });

      return false;
  }

  return false;
}


function resolvers(db: mongodb.Db, _config: Config): object {
  const groups: mongodb.Collection<GroupDoc> = db.collection('groups');

  return {
    Query: {
      group: async (_root, { id }) => {
        const group: GroupDoc | null = await groups.findOne({ id: id });

        return isPendingCreate(group) ? null : group;
      },
      members: async (_root, { input }: { input: MembersInput }) =>  {
        const noCreateGroupPending =  {
          $or: [
            { pending: { $exists: false } },
            { pending: { type: { $ne: 'create-group' } } }
          ]
        };
        const filter = input.inGroupId ?
          { $and: [ { id: input.inGroupId }, noCreateGroupPending ] } :
          noCreateGroupPending;

        const pipelineResults = await groups.aggregate([
          { $match: filter },
          {
            $group: {
              _id: 0,
              memberIds: { $push: '$memberIds' }
            }
          },
          {
            $project: {
              memberIds: {
                $reduce: {
                  input: '$memberIds',
                  initialValue: [],
                  in: { $setUnion: ['$$value', '$$this'] }
                }
              }
            }
          }
        ])
        .toArray();

        const matchingMembers = _.get(pipelineResults[0], 'memberIds', []);

        return matchingMembers;
      },
      groups: async (_root, { input }: { input: GroupsInput }) => {
        const filter = input.withMemberId ?
          { memberIds: input.withMemberId } : {};
        filter['pending'] = { type: { $ne: 'create-group' } };

        return groups.find(filter)
          .toArray();
      }
    },
    Group: {
      id: (group: GroupDoc) => group.id,
      memberIds: (group: GroupDoc) => group.memberIds
    },
    Mutation: {
      createGroup: async (
        _root, { input }: {input: CreateGroupInput}, context: Context) => {
        const g: GroupDoc = {
          id: input.id ? input.id : uuid(),
          memberIds: input.initialMemberIds ? input.initialMemberIds : []
        };
        const reqIdPendingFilter = { 'pending.reqId': context.reqId };
        switch (context.reqType) {
          case 'vote':
            g.pending = { reqId: context.reqId, type: 'create-group' };
          case undefined:
            await groups.insertOne(g);

            return g;
          case 'commit':
            await groups.updateOne(
              reqIdPendingFilter,
              { $unset: { pending: '' } });

            return g;
          case 'abort':
            await groups.deleteOne(reqIdPendingFilter);

            return g;
        }

        return g;
      },
      addMember: (_root, { groupId, id }, context: Context) =>
        addOrRemoveMember(groups, groupId, id, 'add-member', context),
      removeMember: (_root, { groupId, id }, context: Context) =>
        addOrRemoveMember(groups, groupId, id, 'remove-member', context)
    }
  };
}

const groupCliche: ClicheServer = new ClicheServerBuilder('group')
  .initDb((db: mongodb.Db, _config: Config): Promise<any> => {
    const groups: mongodb.Collection<GroupDoc> = db.collection('groups');

    return groups.createIndex({ id: 1 }, { unique: true, sparse: true });
  })
  .resolvers(resolvers)
  .build();

groupCliche.start();
