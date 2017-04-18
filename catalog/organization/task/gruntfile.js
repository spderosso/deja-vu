module.exports = function(grunt) {
  require("mean-loader").GruntTask.task(
      grunt,
      "dv-organization-task",
      [{name: "CreateTask"}, {name: "ShowUncompletedTasks"},
      {name: "ShowUnapprovedTasks"}, {name: "ShowApprovedTasks"}, 
      {name: "ShowAssignedTasks"}, {name: "ShowPendingApprovalTasks"}]);
}
