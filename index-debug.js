/*
 * Primary file for API
 *
 * To enter debug mode, run 'node inspect index-debug' on the terminal
 * The debugger will stop at various debug break-points
 * You use next or cont to move to the next break-point
 * Use 'repl' to inspect values of variables at a particular break-point
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const exampleDebuggingProblem = require('./lib/exampleDebuggingProblem');
const cli = require('./lib/cli');

// Declare the app
const app = {};

// Init function
app.init = function(){

  // Start the server
  debugger;
  server.init();
  debugger;

  // Start the workers
  debugger;
  workers.init();
  debugger;

  // Start the CLI, but make sure it starts last
  debugger;
  setTimeout(function(){
    cli.init();
    debugger;
  },50);
  debugger;

  // Start an example script that has issues (throws an error)
  debugger;
  // Set foo at 1
  let foo = 1;
  console.log("Just assigned 1 to foo");
  debugger;

  // Increment foo
  foo++;
  console.log("Just incremented foo");
  debugger;

  // Square foo
  foo = foo * foo;
  console.log("Just multiplied foo by itself");
  debugger;

  // Convert foo to a string
  foo = foo.toString();
  console.log("Just changed foo to a string");
  debugger;

  // Call the init script that will throw
  exampleDebuggingProblem.init();
  debugger;

};

// Self executing
app.init();


// Export the app
module.exports = app;
