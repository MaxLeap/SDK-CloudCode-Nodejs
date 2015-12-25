'use strict';
var winston = require('winston');
module.exports = function(ML) {
  ML.Log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {
         var now = new Date(Date.now());
         return now.toISOString();
      },
      formatter: function(options) {
        return JSON.stringify({
            '@timestamp': options.timestamp(),
            'level':options.level.toUpperCase(),
            'message': (undefined !== options.message ? options.message : '')
        });
      }
    })
  ]
});
};
