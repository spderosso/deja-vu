module.exports = function(grunt) {
  require("mean-loader").GruntTask.cliche_task(
      grunt,
      "Map",
      [
        "DisplayMap"
      ]
    )
  ;
}