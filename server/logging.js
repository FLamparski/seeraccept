/* global console, _ */
/* global Logger:true */

Logger = {};

['log', 'info', 'warn', 'error'].forEach(function(fname) {
  Logger[fname] = function() {
    console[fname].apply(console, [new Date().toISOString()].concat(_.toArray(arguments)));
  };
});
