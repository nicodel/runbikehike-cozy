/* jshint strict: true, node: true */
'use strict';
var cozydb = require('cozydb');
var Messages = cozydb.getModel('messages', {
  'id'        : String,
  'type'      : String,
  'activity'  : String,
  'date'      : String,
  'text'      : String,
});
Messages.all = function(callback) {
  Messages.request("all", {}, function(err, docs) {
    if (err) {
      callback(err);
    } else {
      callback(null, docs);
    }
  });
};
// Messages.add = function(data, callback) {
//   console.log('Message to add', data);
//   Messages.create(data, function(err, res) {
//     if (err) {
//       callback(err);
//     } else {
//       console.log('messages added', res);
//       callback(null, res);
//     }
//   });
// };
module.exports = Messages;
