/* jshint worker: true, strict: true */

onerror = function(e) {
  'use strict';
  console.log('Worker error', e);
};

onconnect = function(e) {
  'use strict';
  var port = e.ports[0];
  port.onmessage = function(e) {
    //importScripts('./../utils/helpers.js');

    var data = e.data[0];
    var user_unit = e.data[1];

    var scale;
    if (user_unit === 'metric') {
      scale = 1000;
    } else {
      scale = 1609;
    }

    var complete_data = data.reduce(function(a, b) {
      return a.concat(b);
    });
    // console.log('complete_data', complete_data);
    var previous = {
      'date'      : complete_data[0].date,
      'time'      : 0,
      'climb'     : 0,
      'speed'     : 0,
      'altitude'  : 0,
      'distance'  : 0
    };
    var summary_data = complete_data.map(function(value, index) {
      if (value.cumulDistance === 0 || value.cumulDistance >= previous.distance + scale) {
        var time = (new Date(value.date).valueOf() - new Date(previous.date).valueOf()) / 1000;
        // TODO Create some kind of average value for speed
        var speed = (value.cumulDistance - previous.distance) / (time / 1000);
        if (isNaN(speed)) {
          speed = 0;
        } else {
          // speed = utils.Helpers.speedMsToChoice(user_unit, speed).value;
          speed = speedMsToChoice(user_unit, speed).value;
        }
        var newbe = {
          'date'      : value.date,
          'distance'  : value.cumulDistance,
          'latitude'  : value.latitude,
          'longitude' : value.longitude,
          'altitude'  : value.altitude,
          'time'      : time,
          'climb'     : value.altitude - previous.altitude,
          'speed'     : speed
        };
        previous = newbe;
        complete_data[index].interval = true;
        return newbe;
      }
    }).filter(function(value) {
      if (!value) {
        return false;
      } else {
        return true;
      }
    });
    port.postMessage([complete_data, summary_data]);
    port.close();
  };
  port.start();
};

/*
 * Convert a velocity from meters per second into km/h or mph depending choice
 * param {String}   choice      User choice over unit display.
 * param {Number}   value       Speed in m/s
 *
 * return {Array}   s           Contains converted speed (as a Number) and unit (as a String)
 */
function speedMsToChoice(choice, value) {
  "use strict";
  var s = {};
  if (value === null || value === undefined || value < 0 || isNaN(value) || value === Infinity) {
    s.value = '--';
  } else {
    if (choice === 'metric') {
      s.value = (value * 3.6).toFixed(1);
      s.unit = 'km/h';
    } else if (choice === 'imperial') {
      s.value = (value * 2.237).toFixed(1);
      s.unit = 'mph';
    } else {
      s.value = value.toFixed(1);
      s.unit = 'm/s';
    }
  }
  return s;
}
