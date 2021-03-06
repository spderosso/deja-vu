import {
  Collection,
  ComponentRequestTable,
  ConceptDb,
  ConceptServer,
  ConceptServerBuilder,
  Config,
  Context,
  getReturnFields
} from '@deja-vu/concept-server';
import { IResolvers } from 'graphql-tools';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import {
  CreateTaskInput,
  CreateTasksForAssigneesInput,
  TaskDoc,
  TasksInput,
  UpdateTaskInput
} from './schema';


const componentRequestTable: ComponentRequestTable = {
  'approve-task': (extraInfo) => `
    mutation ApproveTask($id: ID!) {
      approveTask (id: $id) ${getReturnFields(extraInfo)}
    }
  `,
  'claim-task': (extraInfo) => `
    mutation ClaimTask($id: ID!, $assigneeId) {
      claimTask (id: $id, assigneeId: $assigneeId) ${getReturnFields(extraInfo)}
    }
  `,
  'complete-task': (extraInfo) => `
    mutation CompleteTask($id: ID!) {
      completeTask (id: $id) ${getReturnFields(extraInfo)}
    }
  `,
  'create-task': (extraInfo) => `
    mutation CreateTask($input: CreateTaskInput!) {
      createTask (input: $input) ${getReturnFields(extraInfo)}
    }
  `,
  'create-tasks-for-assignees': (extraInfo) => `
    mutation CreateTasksForAssignees($input: CreateTasksForAssigneesInput!) {
      createTasksForAssignees (input: $input) ${getReturnFields(extraInfo)}
    }
  `,
  'show-tasks': (extraInfo) => `
    query ShowTasks($input: TasksInput!) {
      tasks(input: $input) ${getReturnFields(extraInfo)}
    }
  `,
  'show-task-count': (extraInfo) => `
    query ShowTaskCount($input: TasksInput!) {
      taskCount(input: $input) ${getReturnFields(extraInfo)}
    }
  `,
  'update-task': (extraInfo) => {
    switch (extraInfo.action) {
      case 'update':
        return `
          mutation UpdateTask($input: UpdateTaskInput!) {
            updateTask(input: $input) ${getReturnFields(extraInfo)}
          }
        `;
      case 'load':
        return `
          query Task($id: ID!) {
            task(id: $id) ${getReturnFields(extraInfo)}
          }
        `;
      default:
        throw new Error('Need to specify extraInfo.action');
    }
  }
};

function getTaskFilter(input: TasksInput) {
  const filter = _.omit(input, ['assigned']);
  if (input.assigned === false) {
    filter['assigneeId'] = null;
  }
  filter['pending'] = { $in: [null, { type: { $ne: 'create-task' } }] };

  return filter;
}

async function updateTask(
  tasks: Collection<TaskDoc>, id: string, updateOp: object,
  _updateType: 'update-task' | 'claim-task' | 'complete-task' | 'approve-task',
  context: Context): Promise<Boolean> {
  // TODO: use updateType in db layers
  return await tasks.updateOne(context, { id }, updateOp);
}

function resolvers(db: ConceptDb, _config: Config): IResolvers {
  const tasks: Collection<TaskDoc> = db.collection('tasks');

  return {
    Query: {
      tasks: async (_root, { input }: { input: TasksInput }) => {
        const filterOp = _.omit(input, ['assigned']);
        if (input.assigned === false) {
          filterOp['assigneeId'] = null;
        }

        return await tasks.find(filterOp);
      },
      task: async (_root, { id }) => await tasks.findOne({ id: id }),
      taskCount: async (_root, { input }: { input: TasksInput }) => {
        return await tasks.countDocuments(getTaskFilter(input));
      }
    },
    Task: {
      id: (task: TaskDoc) => task.id,
      assignerId: (task: TaskDoc) => task.assignerId,
      assigneeId: (task: TaskDoc) => task.assigneeId,
      dueDate: (task: TaskDoc) => task.dueDate
    },
    Mutation: {
      createTask: async (
        _root, { input }: { input: CreateTaskInput }, context: Context) => {
        const newTask: TaskDoc = {
          id: input.id ? input.id : uuid(),
          assignerId: input.assignerId,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate,
          completed: false,
          approved: false
        };

        return await tasks.insertOne(context, newTask);
      },
      createTasksForAssignees: async (
        _root, { input }: { input: CreateTasksForAssigneesInput },
        context: Context) => {
        const newTasks: TaskDoc[] = _.map(input.assigneeIds, (assigneeId) => {
          return {
            id: uuid(),
            assignerId: input.assignerId,
            assigneeId: assigneeId,
            dueDate: input.dueDate,
            completed: false,
            approved: false
          };
        });

        return await tasks.insertMany(context, newTasks);
      },
      updateTask: async (
        _root, { input }: { input: UpdateTaskInput }, context: Context) => {
        return updateTask(
          tasks, input.id, { $set: input }, 'update-task', context);
      },
      claimTask: async (_root, { id, assigneeId }, context: Context) => {
        return updateTask(tasks,
          id, { $set: { assigneeId: assigneeId } }, 'claim-task', context);
      },
      approveTask: async (_root, { id }, context: Context) => {
        return updateTask(tasks,
          id, { $set: { approved: true } }, 'approve-task', context);
      },
      completeTask: async (_root, { id }, context: Context) => {
        return updateTask(tasks,
          id, { $set: { completed: true } }, 'complete-task', context);
      }
    }
  };
}

const taskConcept: ConceptServer = new ConceptServerBuilder('task')
  .initDb((db: ConceptDb, _config: Config): Promise<any> => {
    const tasks: Collection<TaskDoc> = db.collection('tasks');

    return tasks.createIndex({ id: 1 }, { unique: true, sparse: true });
  })
  .componentRequestTable(componentRequestTable)
  .resolvers(resolvers)
  .build();

taskConcept.start();
