const graphql = require("graphql");
import {Promise} from "es6-promise";

import {Mean} from "mean-loader";
import {Helpers} from "helpers";
import {ServerBus} from "server-bus";
import {Grafo} from "grafo";

const uuid = require("uuid");

const mean = new Mean();

const handlers = {
  task: {
    create: Helpers.resolve_create(mean.db, "task"),
    update: Helpers.resolve_update(mean.db, "task")
  }
};

const bus = new ServerBus(
    mean.fqelement, mean.ws, handlers, mean.comp, mean.locs);


/////////////////////

const grafo = new Grafo(mean.db);

const schema = grafo
  .add_type({
    name: "Task",
    fields: {
      atom_id: {"type": graphql.GraphQLString},
      name: {"type": graphql.GraphQLString},
      assigner: {"type": "Assigner"} ,
      assignee: {"type": "Assignee"},
      expiration_date: {"type": graphql.GraphQLString},
      completed: {"type": graphql.GraphQLBoolean},
      approved: {"type": graphql.GraphQLBoolean},
    }
  })
  .add_type({
    name: "Assigner",
    fields: {
      atom_id: {"type": graphql.GraphQLString},
      name: {"type": graphql.GraphQLString},
    }
  })
  .add_type({
    name: "Assignee",
    fields: {
      atom_id: {"type": graphql.GraphQLString},
      name: {"type": graphql.GraphQLString},
    }
  })
 .add_mutation({
    name: "createTask",
    "type": "Task",
    args: {
      name: {"type": graphql.GraphQLString},
      assigner_id: {"type": graphql.GraphQLString} ,
      assignee_id: {"type": graphql.GraphQLString},
      expires_on: {"type": graphql.GraphQLString}
    },
    resolve: (_, {name, assigner_id, assignee_id, expires_on}) => {
      const expiration_date = new Date(expires_on);
      const task = {
        atom_id: uuid.v4(),
        name: name,
        assigner: {atom_id: assigner_id},
        assignee: {atom_id: assignee_id},
        expiration_date: expiration_date,
        completed: false,
        approved: false
      };
      return Promise
        .all([
          mean.db.collection("tasks").insertOne(task),
          bus.create_atom("Task", task.atom_id, task)
          ])
        .then(_ => task)
      } 
  })
 .add_mutation({
    name: "completeTask",
    "type": graphql.GraphQLBoolean,
    args: {
      task_id: {"type": graphql.GraphQLString}
    },
    resolve: (_, {task_id}) => {
      const update_op = {$set: {completed: true}};
      return mean.db.collection("tasks")
        .updateOne({atom_id: task_id}, update_op)
        .then(_ => bus.update_atom("Task", task_id, update_op))
        .then(_ => true);
      }
  })
 .add_mutation({
    name: "approveTask",
    "type": graphql.GraphQLBoolean,
    args: {
      task_id: {"type": graphql.GraphQLString}
    },
    resolve: (_, {task_id}) => {
      const update_op = {$set: {approved: true}};
      return mean.db.collection("tasks")
        .updateOne({atom_id: task_id}, update_op)
        .then(_ => bus.update_atom("Task", task_id, update_op))
        .then(_ => true);
      }
  })
  .add_query({
    name: "uncompletedTasks",
    type: "[Task]",
    args: {
      assignee_id: {"type": graphql.GraphQLString}
    },
    resolve: (root, {assignee_id}) => {
      return mean.db.collection("tasks").find({ $and: 
        [{"assignee.atom_id": assignee_id}, {completed: false}] })
        .toArray();
    }
  })
  .add_query({
    name: "unapprovedTasks",
    type: "[Task]",
    args: {
      assignee_id: {"type": graphql.GraphQLString}
    },
    resolve: (root, {assignee_id}) => {
      return mean.db.collection("tasks").find({ $and: 
        [{"assignee.atom_id": assignee_id}, {completed: true},
        {approved: false}] }).toArray();
    }
  })
  .add_query({
    name: "approvedTasks",
    type: "[Task]",
    args: {
      assignee_id: {"type": graphql.GraphQLString}
    },
    resolve: (root, {assignee_id}) => {
      return mean.db.collection("tasks").find({ $and: 
        [{"assignee.atom_id": assignee_id}, {approved: true}] })
        .toArray();
    }
  })
  .add_query({
    name: "assignedTasks",
    type: "[Task]",
    args: {
      assigner_id: {"type": graphql.GraphQLString}
    },
    resolve: (root, {assigner_id}) => {
      return mean.db.collection("tasks").find({ $and: 
        [{"assigner.atom_id": assigner_id}, 
        {completed: false}] }).toArray();
    }
  })
  .add_query({
    name: "pendingApprovalTasks",
    type: "[Task]",
    args: {
      assigner_id: {"type": graphql.GraphQLString}
    },
    resolve: (root, {assigner_id}) => {
      return mean.db.collection("tasks").find({ $and: 
        [{"assigner.atom_id": assigner_id}, {completed: true},
        {approved: false}] }).toArray();
    }
  })
  .schema();


Helpers.serve_schema(mean.ws, schema);

grafo.init().then(_ => {
  if (mean.debug) {
    mean.db.collection("tasks").insertMany([
      {atom_id: "1", name: "Eat", completed: false, approved: false,
      assigner: {atom_id: "10"}, assignee: {atom_id: "11"}},
      {atom_id: "2", name: "Sleep", completed: true, approved: false,
      assigner: {atom_id: "10"}, assignee: {atom_id: "11"}},
      {atom_id: "3", name: "Work", completed: true, approved: true,
      assigner: {atom_id: "10"}, assignee: {atom_id: "11"}}],
      (err, res) => { if (err) throw err; });

    mean.db.collection("assigners").insertOne(
      {name: "Bob", atom_id: "10"},
      (err, res) => { if (err) throw err; });

    mean.db.collection("assignees").insertOne(
      {name: "Joe", atom_id: "11"},
      (err, res) => { if (err) throw err; });

  }

  mean.start();
});