/* jshint strict: true, node: true */
'use strict';
var cozydb = require('cozydb');
var Sessions = cozydb.getModel('sessions', {
  'id'        : String,
  'type'      : String,
  'name'      : String,
  'duration'  : String,
  'distance'  : String,
  'date'      : String,
  'avg_speed' : String,
  'calories'  : String,
  'alt_max'   : String,
  'alt_min'   : String,
  'climb_pos' : String,
  'climb_neg' : String,
  'map'       : Boolean,
  'activity'  : String,
  'text'      : String,
  'family'    : String,
  'data'      : cozydb.NoSchema,
  'value'     : String
});
Sessions.all = function(callback) {
  Sessions.request("all", {}, function(err, docs) {
    if (err) {
      callback(err);
    } else {
      callback(null, docs);
    }
  });
};
// Sessions.add = function(data, callback) {
//   console.log('data to add through model is', data);
//   Sessions.create(data, function(err, res) {
//     if (err) {
//       callback(err);
//     } else {
//       console.log('messages after add are', res);
//       callback(null, res);
//     }
//   });
// };
module.exports = Sessions;
