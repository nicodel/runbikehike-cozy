"use strict";

var utils = utils || {};

utils.GPX = function() {
    var olat = null;
    var olon = null;
    var distance = 0;
    function importFile(inPath, callback) {
        olat = null;
        olon = null;
        distance = 0;
        __parse(inPath, callback);
    }
    function exportToFile() {}
    function __parse(xml, callback) {
        var track = {
            date: "",
            name: "",
            duration: 0,
            distance: 0,
            avg_speed: 0,
            calories: 0,
            alt_max: 0,
            alt_min: 0,
            climb_pos: 0,
            climb_neg: 0,
            map: false,
            data: []
        };
        var missing_time, start_time, end_time;
        var metadata = xml.getElementsByTagName("metadata");
        if (metadata.length > 0) {
            var time = metadata[0].getElementsByTagName("time");
            if (time.length > 0) {
                track.date = time[0].textContent;
            } else {
                missing_time = true;
            }
        } else {
            missing_time = true;
        }
        var trk = xml.getElementsByTagName("trk");
        var t;
        if (trk.length > 0) {
            t = trk[0];
        } else {
            callback({
                error: true,
                res: "no track found in loaded file"
            });
        }
        var name = t.getElementsByTagName("name");
        if (name.length > 0) {
            track.name = name[0].textContent;
        } else {
            track.name = __nameIt();
        }
        var trkseg = t.getElementsByTagName("trkseg");
        var trkpt;
        var tag;
        var previous;
        if (trkseg.length > 0) {
            for (var seg_nb = 0; seg_nb < trkseg.length; seg_nb++) {
                track.data[seg_nb] = [];
                trkpt = trkseg[seg_nb].getElementsByTagName("trkpt");
                if (trkpt.length > 0) {
                    for (var pt_nb = 0; pt_nb < trkpt.length; pt_nb++) {
                        var point = {};
                        var p = trkpt[pt_nb];
                        point.latitude = parseFloat(p.getAttribute("lat"));
                        point.longitude = parseFloat(p.getAttribute("lon"));
                        point.distance = __getDistance(point.latitude, point.longitude);
                        distance += point.distance;
                        point.cumulDistance = distance;
                        tag = p.getElementsByTagName("time");
                        if (tag.length > 0) {
                            point.date = tag[0].textContent;
                            if (missing_time) {
                                track.date = point.date;
                                missing_time = false;
                            }
                            if (seg_nb === 0 && pt_nb === 0) {
                                start_time = new Date(point.date);
                            }
                            end_time = new Date(point.date);
                        } else {
                            track.date = 0;
                        }
                        tag = p.getElementsByTagName("ele");
                        if (tag.length > 0) {
                            point.altitude = parseFloat(tag[0].textContent);
                            var alt = point.altitude;
                            if (track.alt_min === 0 || alt < track.alt_min) {
                                track.alt_min = alt;
                            }
                            if (track.alt_max === 0 || alt > track.alt_max) {
                                track.alt_max = alt;
                            }
                            if (isNaN(previous)) {
                                previous = alt;
                            } else {
                                if (alt > previous) {
                                    track.climb_pos += alt - previous;
                                } else if (alt < previous) {
                                    track.climb_neg += previous - alt;
                                }
                                previous = alt;
                            }
                        } else {
                            track.alt_max = null;
                            track.alt_min = null;
                        }
                        tag = p.getElementsByTagName("speed");
                        if (tag.length > 0) {
                            point.speed = parseFloat(tag[0].textContent);
                        }
                        tag = p.getElementsByTagName("time");
                        if (tag.length > 0) {
                            point.date = new Date(tag[0].textContent);
                        }
                        tag = p.getElementsByTagName("hdop");
                        if (tag.length > 0) {
                            point.accuracy = parseFloat(tag[0].textContent);
                        }
                        tag = p.getElementsByTagName("vdop");
                        if (tag.length > 0) {
                            point.vertAccuracy = parseFloat(tag[0].textContent);
                        }
                        track.data[seg_nb].push(point);
                    }
                } else {
                    callback({
                        error: true,
                        res: "Could not parse trkpt from file"
                    });
                }
            }
        } else {
            callback({
                error: true,
                res: "Could not parse track segment from file"
            });
        }
        if (end_time && start_time) {
            track.duration = (end_time - start_time) / 1e3;
        } else {
            track.duration = 0;
        }
        if (missing_time) {
            track.duration = null;
        }
        track.distance = distance;
        if (track.duration !== "") {
            track.avg_speed = track.distance / track.duration;
        }
        track.map = true;
        callback({
            error: false,
            res: track
        });
    }
    function __nameIt() {
        var d = new Date();
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();
        if (month < 10) {
            month = "0" + month.toString();
        }
        if (day < 10) {
            day = "0" + day.toString();
        }
        if (hour < 10) {
            hour = "0" + hour.toString();
        }
        if (min < 10) {
            min = "0" + min.toString();
        }
        if (sec < 10) {
            sec = "0" + sec.toString();
        }
        return "TR-" + year + month + day + "-" + hour + min + sec;
    }
    function __getDistance(lat, lon) {
        var dist = 0;
        if (olat !== null) {
            dist = __distanceFromPrev(olat, olon, lat, lon);
        }
        olat = lat;
        olon = lon;
        return dist;
    }
    function __distanceFromPrev(lat1, lon1, lat2, lon2) {
        var lat1Rad = lat1 * (Math.PI / 180);
        var lon1Rad = lon1 * (Math.PI / 180);
        var lat2Rad = lat2 * (Math.PI / 180);
        var lon2Rad = lon2 * (Math.PI / 180);
        var dLat = lat2Rad - lat1Rad;
        var dLon = lon2Rad - lon1Rad;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var R = 6371 * 1e3;
        return R * c;
    }
    return {
        importFile: importFile,
        exportToFile: exportToFile
    };
}();

"use strict";

var utils = utils || {};

utils.Tracks = function() {
    var current_track = {};
    var segment = 0;
    var start_date;
    var distance = 0;
    var olat = null;
    var olon = null;
    var nb_point = 0;
    var previous;
    var alt_min = 0;
    var alt_max = 0;
    var climb_pos = 0;
    var climb_neg = 0;
    function open() {
        current_track = {};
        segment = 0;
        var d = new Date();
        current_track.date = d.toISOString();
        start_date = d.getTime();
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();
        if (month < 10) {
            month = "0" + month.toString();
        }
        if (day < 10) {
            day = "0" + day.toString();
        }
        if (hour < 10) {
            hour = "0" + hour.toString();
        }
        if (min < 10) {
            min = "0" + min.toString();
        }
        if (sec < 10) {
            sec = "0" + sec.toString();
        }
        current_track.name = "TR-" + year + month + day + "-" + hour + min + sec;
        current_track.duration = 0;
        current_track.distance = 0;
        current_track.map = "";
        current_track.data = [];
        nb_point = 0;
        console.log("current_track", current_track);
        return current_track;
    }
    function newSegment() {
        segment += 1;
        console.log("segment", segment);
    }
    function addNode(inNode, inDistance, inDuration) {
        if (!current_track.data[segment]) {
            current_track.data[segment] = [];
        }
        current_track.data[segment].push(inNode);
        current_track.distance = inDistance;
        current_track.duration = inDuration;
        __getAltitudeClimbValues(inNode.altitude);
        nb_point += 1;
        console.log("current_track", current_track);
    }
    function getDistance(lat, lon) {
        if (olat !== null) {
            distance += __distanceFromPrev(olat, olon, lat, lon);
        }
        olat = lat;
        olon = lon;
        return distance;
    }
    function getDuration(time) {
        return time - start_date;
    }
    function close() {
        current_track.alt_min = alt_min;
        current_track.alt_max = alt_max;
        current_track.climb_pos = climb_pos;
        current_track.climb_neg = climb_neg;
        return current_track;
    }
    function reset() {
        distance = 0;
    }
    function __distanceFromPrev(lat1, lon1, lat2, lon2) {
        var lat1Rad = lat1 * (Math.PI / 180);
        var lon1Rad = lon1 * (Math.PI / 180);
        var lat2Rad = lat2 * (Math.PI / 180);
        var lon2Rad = lon2 * (Math.PI / 180);
        var dLat = lat2Rad - lat1Rad;
        var dLon = lon2Rad - lon1Rad;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var R = 6371 * 1e3;
        return R * c;
    }
    function __getAltitudeClimbValues(alt) {
        if (alt_min === 0 || alt > alt_min) {
            alt_min = alt;
        }
        if (alt_max === 0 || alt < alt_max) {
            alt_max = alt;
        }
        if (isNaN(previous)) {
            previous = alt;
        } else {
            if (alt > previous) {
                climb_pos += alt - previous;
            } else if (alt < previous) {
                climb_neg += previous - alt;
            }
        }
    }
    function importFromFile(inTrack) {
        console.log("unload inTrack", inTrack);
        current_track = inTrack;
        start_date = current_track.data[0].date;
        nb_point = 0;
        return current_track;
    }
    function resumed() {
        olat = null;
        olon = null;
    }
    return {
        open: open,
        newSegment: newSegment,
        addNode: addNode,
        getDuration: getDuration,
        getDistance: getDistance,
        reset: reset,
        close: close,
        importFromFile: importFromFile,
        resumed: resumed
    };
}();

"use strict";

var utils = utils || {};

utils.Chrono = function() {
    var chrono_demarre = false;
    var chrono_ecoule = null;
    var chrono_depart = null;
    var chrono_dernier = null;
    var chrono_champ;
    var chrono_timeout;
    function arreterChrono() {
        if (chrono_demarre) {
            chrono_dernier = new Date().getTime();
            chrono_ecoule += chrono_dernier - chrono_depart;
            chrono_demarre = false;
        }
        RAZChrono();
        return true;
    }
    function chargerChronoDyna(champ) {
        if (champ) {
            chrono_champ = champ;
        }
        chrono_champ.textContent = tempsChrono();
        chrono_timeout = window.setTimeout(chargerChronoDyna, 10);
        return true;
    }
    function demarrerChrono() {
        console.log("demarrerChrono;");
        if (!chrono_demarre) {
            chrono_depart = new Date().getTime();
            chrono_demarre = true;
            console.log("chrono_demarre: ", chrono_demarre);
        }
        return true;
    }
    function RAZChrono() {
        if (!chrono_demarre) {
            chrono_ecoule = 0;
            chrono_depart = 0;
            chrono_dernier = 0;
        }
        return true;
    }
    function tempsChrono() {
        var cnow;
        if (chrono_demarre) {
            chrono_dernier = new Date().getTime();
            cnow = new Date(chrono_ecoule + (chrono_dernier - chrono_depart));
        } else {
            cnow = new Date(chrono_ecoule);
        }
        var ch = cnow.getUTCHours();
        var cm = cnow.getUTCMinutes();
        var cs = cnow.getUTCSeconds();
        if (cs < 10) {
            cs = "0" + cs;
        }
        if (cm < 10) {
            cm = "0" + cm;
        }
        return ch + ":" + cm + ":" + cs;
    }
    function pauseIt() {
        if (chrono_demarre) {
            chrono_dernier = new Date().getTime();
            chrono_ecoule += chrono_dernier - chrono_depart;
            chrono_demarre = false;
        }
        return true;
    }
    function resume() {
        chrono_depart = new Date().getTime();
        chrono_demarre = true;
        return true;
    }
    return {
        start: demarrerChrono,
        stop: arreterChrono,
        reset: RAZChrono,
        load: chargerChronoDyna,
        pauseIt: pauseIt,
        resume: resume
    };
}();

"use strict";

var utils = utils || {};

utils.Map = function() {
    var map;
    var map_options = {
        zoomControl: false
    };
    var polyline_options = {
        color: "blue",
        weight: 4
    };
    var marker_options = {
        clickable: false,
        icon: new L.Icon({
            iconUrl: "./img/marker-icon.png",
            iconSize: [ 25, 41 ],
            iconAnchor: [ 10, 41 ],
            shadowUrl: "./img/marker-shadow.png",
            shadowSize: [ 41, 41 ],
            shadowAnchor: [ 10, 41 ]
        })
    };
    var interval_marker = {
        clickable: false,
        icon: new L.Icon({
            iconUrl: "./img/marker-icon.png",
            iconSize: [ 18, 34 ],
            iconAnchor: [ 5, 34 ],
            shadowUrl: "./img/marker-shadow.png",
            shadowSize: [ 34, 34 ],
            shadowAnchor: [ 5, 41 ]
        })
    };
    function initialize(element) {
        if (map !== undefined) {
            removeMap();
        }
        map = L.map(element, map_options);
        map.on("load", function() {});
    }
    function getMap(track) {
        L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '<a href="http://www.osm.org">OpenStreetMap</a>'
        }).addTo(map);
        var layers = new L.FeatureGroup();
        var pt, point, seg, segment, len, coordinates, polyline, marker;
        for (seg = 0; seg < track.length; seg++) {
            segment = track[seg];
            coordinates = [];
            len = segment.length;
            for (pt = 0; pt < len; pt++) {
                point = new L.LatLng(segment[pt].latitude, segment[pt].longitude);
                if (pt === 0 || pt === len - 1) {
                    marker = new L.marker(point, marker_options);
                    layers.addLayer(marker);
                } else if (segment[pt].interval) {
                    marker = new L.Marker(point, interval_marker);
                    layers.addLayer(marker);
                }
                coordinates.push(point);
            }
            polyline = new L.polyline(coordinates, polyline_options);
            layers.addLayer(polyline);
        }
        map.fitBounds(layers.getBounds());
        layers.addTo(map);
    }
    function removeMap() {
        map.remove();
    }
    return {
        initialize: initialize,
        getMap: getMap,
        removeMap: removeMap
    };
}();

"use strict";

var utils = utils || {};

utils.Helpers = function() {
    function formatDistance(choice, value, canNegative) {
        var distance = {};
        if (value === null || value === undefined || value < 0 && !canNegative) {
            distance.value = "--";
        } else {
            if (choice === "metric") {
                distance.value = (value / 1e3).toFixed(1);
                distance.unit = "km";
            } else if (choice === "imperial") {
                distance.value = (value / 1609.344).toFixed(1);
                distance.unit = "miles";
            } else {
                distance.value = value.toFixed(1);
                distance.unit = "m";
            }
        }
        return distance;
    }
    function formatSmallDistance(choice, value, canNegative) {
        var distance = {};
        if (value === null || value === undefined || value < 0 && !canNegative) {
            distance.value = "--";
        } else {
            if (choice === "metric") {
                distance.value = (value * 1).toFixed(0);
                distance.unit = "m";
            } else if (choice === "imperial") {
                distance.value = (value * 3.2808).toFixed(0);
                distance.unit = "ft";
            } else {
                distance.value = value.toFixed(1);
                distance.unit = "m";
            }
        }
        return distance;
    }
    function inputDistanceToM(choice, value) {
        var distance = 0;
        if (choice === "metric") {
            distance = value * 1e3;
        } else if (choice === "imperial") {
            distance = (value * 1609.344).toFixed(1);
        }
        return distance;
    }
    function formatSpeed(choice, value) {
        var speed = {};
        if (value === null || value === undefined || value < 0 || isNaN(value) || value === Infinity) {
            speed.value = "--";
        } else {
            if (choice === "metric") {
                speed.value = (value * 3.6).toFixed(1);
                speed.unit = "km/h";
            } else if (choice === "imperial") {
                speed.value = (value * 2.237).toFixed(1);
                speed.unit = "mph";
            } else {
                speed.value = value.toFixed(1);
                speed.unit = "m/s";
            }
        }
        return speed;
    }
    function formatDate(value) {
        if (value === null) {
            return "";
        } else {
            var date = new Date(value);
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            var day = date.getDate();
            if (month < 10) {
                month = "0" + month.toString();
            }
            if (day < 10) {
                day = "0" + day.toString();
            }
            return day + "/" + month + "/" + year;
        }
    }
    function formatTime(value) {
        if (value === null) {
            return "";
        } else {
            var date = new Date(value);
            var hours = date.getHours();
            if (hours < 10) {
                hours = "0" + hours;
            }
            var minutes = date.getMinutes();
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            var seconds = date.getSeconds();
            if (seconds < 10) {
                seconds = "0" + seconds;
            }
            return hours + ":" + minutes + ":" + seconds;
        }
    }
    function formatDuration(sec) {
        if (sec === 0) {
            return {
                hour: 0,
                min: 0,
                sec: 0
            };
        }
        var hh = Math.floor(sec / 3600);
        var mm = Math.floor((sec - hh * 3600) / 60);
        var ss = Math.floor(sec - hh * 3600 - mm * 60);
        if (hh < 10) {
            hh = "0" + hh;
        }
        if (mm < 10) {
            mm = "0" + mm;
        }
        if (ss < 10) {
            ss = "0" + ss;
        }
        return {
            hour: hh,
            min: mm,
            sec: ss
        };
    }
    function calculateCalories(gender, weigth, height, age, distance, duration, activity) {
        console.log("calculate calories");
        if (distance === 0 || duration === 0) {
            return 0;
        }
        var bmr = __MifftlinStJeorEquation(gender, weigth, height, age, distance, duration);
        console.log("RevisedHarrisBenedictEquation", bmr);
        var rate = 0;
        var speed = distance / duration * 3.6;
        if (activity === "walking") {
            if (speed <= 4.2) {
                rate = 3;
            } else if (speed <= 5.3) {
                rate = 3.5;
            } else if (speed <= 6) {
                rate = 4.3;
            } else if (speed <= 7) {
                rate = 6;
            } else if (speed <= 8) {
                rate = 8.3;
            } else {
                rate = 9;
            }
        } else if (activity === "running") {
            if (speed <= 7) {
                rate = 6;
            } else if (speed <= 8) {
                rate = 8.3;
            } else if (speed <= 8.8) {
                rate = 9;
            } else if (speed <= 10) {
                rate = 10;
            } else if (speed <= 10.8) {
                rate = 11;
            } else if (speed <= 11.5) {
                rate = 11.5;
            } else if (speed <= 12.3) {
                rate = 12.5;
            } else if (speed <= 13.2) {
                rate = 13.5;
            } else if (speed <= 14) {
                rate = 14;
            } else if (speed <= 15.8) {
                rate = 15;
            } else if (speed <= 17.2) {
                rate = 16;
            } else if (speed <= 18.4) {
                rate = 17;
            } else if (speed <= 20.2) {
                rate = 18;
            } else if (speed <= 21.5) {
                rate = 19;
            } else if (speed <= 22.5) {
                rate = 19.8;
            } else {
                rate = 20;
            }
        } else if (activity === "racing") {
            rate = 23;
        } else if (activity === "swimming") {
            if (speed <= .5) {
                rate = 7;
            } else if (speed <= .8) {
                rate = 8.6;
            } else if (speed <= 1.1) {
                rate = 10;
            } else {
                rate = 11;
            }
        } else if (activity === "regular_biking") {
            if (speed <= 10) {
                rate = 5.8;
            } else if (speed <= 19.15) {
                rate = 6.8;
            } else if (speed <= 22.36) {
                rate = 6.8;
            } else if (speed <= 25.58) {
                rate = 10;
            } else if (speed <= 30.57) {
                rate = 12;
            } else {
                rate = 15.8;
            }
        } else if (activity === "mountain_biking") {
            rate = 8.5;
        } else if (activity === "time_trial_biking") {
            rate = 16;
        } else if (activity === "trekking") {
            rate = 7.3;
        } else if (activity === "skiing") {
            rate = 7;
        } else if (activity === "paddling") {
            rate = 7;
        } else if (activity === "climbing") {
            rate = 7;
        }
        var calories = Math.round(bmr * rate / 86400 * duration);
        return calories;
    }
    function __MifftlinStJeorEquation(g, w, h, a) {
        var s;
        if (g === "male") {
            s = 5;
        } else {
            s = -161;
        }
        return 10 * w + 6.25 * h - 5 * a + s;
    }
    function distanceMeterToChoice(choice, value, canNegative) {
        var d = {};
        if (value === null || value === undefined || value < 0 && !canNegative) {
            d.value = "--";
        } else {
            if (choice === "metric") {
                d.value = (value / 1e3).toFixed(1);
                d.unit = "km";
            } else if (choice === "imperial") {
                d.value = (value / 1609.344).toFixed(1);
                d.unit = "miles";
            } else {
                d.value = value.toFixed(1);
                d.unit = "m";
            }
        }
        return d;
    }
    function distanceChoiceToMeter(choice, value) {
        var d = 0;
        if (choice === "metric") {
            d = value * 1e3;
        } else if (choice === "imperial") {
            d = (value * 1609.344).toFixed(1);
        }
        return d;
    }
    function speedMsToChoice(choice, value) {
        var s = {};
        if (value === null || value === undefined || value < 0 || isNaN(value) || value === Infinity) {
            s.value = "--";
        } else {
            if (choice === "metric") {
                s.value = (value * 3.6).toFixed(1);
                s.unit = "km/h";
            } else if (choice === "imperial") {
                s.value = (value * 2.237).toFixed(1);
                s.unit = "mph";
            } else {
                s.value = value.toFixed(1);
                s.unit = "m/s";
            }
        }
        return s;
    }
    function speedChoiceToMs(choice, value) {
        var s = 0;
        if (choice === "metric") {
            s = (value / 3.6).toFixed(1);
        } else if (choice === "imperial") {
            s = (value / 2.237).toFixed(1);
        }
        return s;
    }
    function checkDate(input) {
        var minYear = 1900;
        var maxYear = new Date().getFullYear();
        var errorMsg = "";
        var re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        if (input !== "") {
            var date = input.match(re);
            if (date) {
                if (date[1] < 1 || date[1] > 31) {
                    errorMsg = "Invalid value for day: " + date[1];
                    return [ false, errorMsg ];
                } else if (date[2] < 1 || date[2] > 12) {
                    errorMsg = "Invalid value for month: " + date[2];
                    return [ false, errorMsg ];
                } else if (date[3] < minYear || date[3] > maxYear) {
                    errorMsg = "Invalid value for year: " + date[3] + " - must be between " + minYear + " and " + maxYear;
                    return [ false, errorMsg ];
                }
            } else {
                errorMsg = "Invalid date format: " + input;
                return [ false, errorMsg ];
            }
            return [ true, [ date[1], date[2], date[3] ] ];
        }
    }
    function checkTime(input) {
        var errorMsg = "";
        var re = /^(\d{1,2}):(\d{2}):(\d{2})(:00)?([ap]m)?$/;
        if (input !== "") {
            var time = input.match(re);
            if (time) {
                if (time[4]) {
                    if (time[1] < 1 || time[1] > 12) {
                        errorMsg = "Invalid value for hours: " + time[1];
                        return [ false, errorMsg ];
                    }
                } else {
                    if (time[1] > 23) {
                        errorMsg = "Invalid value for hours: " + time[1];
                        return [ false, errorMsg ];
                    }
                }
                if (time[2] > 59) {
                    errorMsg = "Invalid value for minutes: " + time[2];
                    return [ false, errorMsg ];
                }
            } else {
                errorMsg = "Invalid time format: " + input;
                return [ false, errorMsg ];
            }
            return [ true, [ time[1], time[2], time[3] ] ];
        }
    }
    function formatDegree(degree) {
        var minutes = (degree - Math.floor(degree)) * 60;
        var seconds = (minutes - Math.floor(minutes)) * 60;
        return Math.floor(degree) + "°" + (minutes < 10 ? "0" : "") + Math.floor(minutes) + "'" + (seconds < 10 ? "0" : "") + seconds.toFixed(2) + '"';
    }
    function __formatDegreeLikeGeocaching(degree) {
        var minutes = (degree - Math.floor(degree)) * 60;
        return Math.floor(degree) + "°" + (minutes < 10 ? "0" : "") + minutes.toFixed(3) + "'";
    }
    function formatLatitude(degree) {
        return (degree > 0 ? "N" : "S") + " " + __formatDegreeLikeGeocaching(Math.abs(degree));
    }
    function formatLongitude(degree) {
        return (degree > 0 ? "E" : "W") + " " + __formatDegreeLikeGeocaching(Math.abs(degree));
    }
    return {
        distanceMeterToChoice: distanceMeterToChoice,
        formatSmallDistance: formatSmallDistance,
        distanceChoiceToMeter: distanceChoiceToMeter,
        speedMsToChoice: speedMsToChoice,
        speedChoiceToMs: speedChoiceToMs,
        formatDistance: formatDistance,
        inputDistanceToM: inputDistanceToM,
        formatSpeed: formatSpeed,
        formatDate: formatDate,
        formatTime: formatTime,
        formatDuration: formatDuration,
        calculateCalories: calculateCalories,
        checkDate: checkDate,
        checkTime: checkTime,
        formatLatitude: formatLatitude,
        formatLongitude: formatLongitude
    };
}();

"use strict";

var models = models || {};

models.athletics = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "athletics";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.distance = options.distance || 0;
    this.avg_speed = options.avg_speed || 0;
    this.calories = options.calories || 0;
    this.alt_max = options.alt_max || 0;
    this.alt_min = options.alt_min || 0;
    this.climb_pos = options.climb_pos || 0;
    this.climb_neg = options.climb_neg || 0;
    this.map = options.map || false;
    this.data = options.data || [];
};

"use strict";

var models = models || {};

models.cycling = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "cycling";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.distance = options.distance || 0;
    this.avg_speed = options.avg_speed || 0;
    this.calories = options.calories || 0;
    this.alt_max = options.alt_max || 0;
    this.alt_min = options.alt_min || 0;
    this.climb_pos = options.climb_pos || 0;
    this.climb_neg = options.climb_neg || 0;
    this.map = options.map || false;
    this.data = options.data || [];
};

"use strict";

var models = models || {};

models.fighting = function(options) {
    this.type = options.type || "fighting";
    this.family = options.family || "fighting";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.calories = options.calories || 0;
};

"use strict";

var models = models || {};

models.message = function(options) {
    this.type = options.type || "message";
    this.activity = options.activity || "message";
    this.date = options.date || new Date().toISOString();
    this.text = options.text || "";
};

"use strict";

var models = models || {};

models.mountaineering = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "mountaineering";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.distance = options.distance || 0;
    this.calories = options.calories || 0;
    this.alt_max = options.alt_max || 0;
    this.alt_min = options.alt_min || 0;
    this.climb_pos = options.climb_pos || 0;
    this.climb_neg = options.climb_neg || 0;
    this.map = options.map || false;
    this.data = options.data || [];
};

"use strict";

var models = models || {};

models.net = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "net";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.calories = options.calories || 0;
};

"use strict";

var models = models || {};

models.sliding = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "sliding";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.distance = options.distance || 0;
    this.avg_speed = options.avg_speed || 0;
    this.calories = options.calories || 0;
    this.alt_max = options.alt_max || 0;
    this.alt_min = options.alt_min || 0;
    this.climb_pos = options.climb_pos || 0;
    this.climb_neg = options.climb_neg || 0;
    this.map = options.map || false;
    this.data = options.data || [];
};

"use strict";

var models = models || {};

models.swimming = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "swimming";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.distance = options.distance || 0;
    this.avg_speed = options.avg_speed || 0;
    this.calories = options.calories || 0;
};

"use strict";

var models = models || {};

models.team = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "team";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.calories = options.calories || 0;
};

"use strict";

var models = models || {};

models.waterSport = function(options) {
    this.type = options.type || "session";
    this.family = options.family || "watersport";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.name = options.name || "";
    this.duration = options.duration || 0;
    this.distance = options.distance || 0;
    this.avg_speed = options.avg_speed || 0;
    this.calories = options.calories || 0;
    this.map = options.map || false;
    this.data = options.data || [];
};

"use strict";

var views = views || {};

views.dashboard_message = Backbone.NativeView.extend({
    tagName: "li",
    template: microtemplate(document.getElementById("dashboard_message").innerHTML),
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(Preferences, "change", this.render);
    },
    extend: Backbone.Events,
    render: function() {
        this.el.innerHTML = this.template({
            session_cid: this.model.get("session_cid"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            text: this.model.get("text")
        });
        return this;
    }
});

"use strict";

var views = views || {};

views.dashboard_summary_1 = Backbone.NativeView.extend({
    tagName: "li",
    template: microtemplate(document.getElementById("session-summary-template-1").innerHTML),
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(Preferences, "change", this.render);
    },
    extend: Backbone.Events,
    render: function() {
        var dist = utils.Helpers.distanceMeterToChoice(Preferences.get("unit"), this.model.get("distance"), false);
        var speed = utils.Helpers.speedMsToChoice(Preferences.get("unit"), this.model.get("avg_speed"));
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var activity = this.model.get("activity");
        this.el.innerHTML = this.template({
            session_cid: this.model.cid,
            collection: this.model.get("collection"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            calories: this.model.get("calories"),
            distance: dist.value + " " + dist.unit,
            duration: duration.hour + ":" + duration.min + ":" + duration.sec,
            avg_speed: speed.value + " " + speed.unit,
            activity: activity,
            icon_path: "img/" + this.model.get("type") + "/" + this.model.get("family") + "/" + activity + ".png"
        });
        return this;
    }
});

"use strict";

var views = views || {};

views.dashboard_summary_2 = Backbone.NativeView.extend({
    tagName: "li",
    template: microtemplate(document.getElementById("session-summary-template-2").innerHTML),
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(Preferences, "change", this.render);
    },
    extend: Backbone.Events,
    render: function() {
        var activity = this.model.get("activity");
        this.el.innerHTML = this.template({
            session_cid: this.model.cid,
            date: utils.Helpers.formatDate(this.model.get("date")),
            value: this.model.get("value"),
            activity: activity,
            icon_path: "img/body_weight.png"
        });
        return this;
    }
});

"use strict";

var views = views || {};

views.dashboard_summary_3 = Backbone.NativeView.extend({
    tagName: "li",
    template: microtemplate(document.getElementById("session-summary-template-3").innerHTML),
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(Preferences, "change", this.render);
    },
    extend: Backbone.Events,
    render: function() {
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var activity = this.model.get("activity");
        this.el.innerHTML = this.template({
            session_cid: this.model.cid,
            collection: this.model.get("collection"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            calories: this.model.get("calories"),
            duration: duration.hour + ":" + duration.min + ":" + duration.sec,
            activity: activity,
            icon_path: "img/" + this.model.get("type") + "/" + this.model.get("family") + "/" + activity + ".png"
        });
        return this;
    }
});

"use strict";

var views = views || {};

views.detailled_1 = Backbone.NativeView.extend({
    el: "#session-view",
    session_id: "",
    dom: {
        map: document.getElementById("session-map-container")
    },
    template: microtemplate(document.getElementById("session-details-template").innerHTML),
    events: {
        "click #session-1-delete": "showModal"
    },
    initialize: function() {
        this.render();
    },
    showModal: function() {
        console.log("showModal");
        new ModalView({
            model: this.model
        });
    },
    deleteSession: function(el) {
        var session = el.target.getAttribute("session_id");
        this.model.destroy({
            success: function(model, response) {
                console.log("deleteSession - success", model, response);
                Sessions.trigger("removed");
            },
            error: function(model, error) {
                console.log("deleteSession - error", model, error);
            }
        });
    },
    render: function() {
        var user_unit = Preferences.get("unit");
        var dist = utils.Helpers.distanceMeterToChoice(user_unit, this.model.get("distance"), false);
        var speed = utils.Helpers.speedMsToChoice(user_unit, this.model.get("avg_speed"));
        var alt_max = utils.Helpers.distanceMeterToChoice(user_unit, this.model.get("alt_max"), false);
        var alt_min = utils.Helpers.distanceMeterToChoice(user_unit, this.model.get("alt_min"), false);
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        this.el.innerHTML = this.template({
            session_cid: this.model.get("session_cid"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            time: utils.Helpers.formatTime(this.model.get("date")),
            calories: this.model.get("calories"),
            distance: dist.value + " " + dist.unit,
            duration: duration.hour + ":" + duration.min + ":" + duration.sec,
            avg_speed: speed.value + " " + speed.unit,
            alt_max: alt_max.value + " " + alt_max.unit,
            alt_min: alt_min.value + " " + alt_min.unit,
            activity: this.model.get("activity")
        });
        var data = this.model.get("data");
        if (data.length !== 0) {
            if (!!window.SharedWorker) {
                var that = this;
                var dataWorker = new SharedWorker("js/workers/data_compute.js");
                console.log("dataWorker", dataWorker);
                dataWorker.port.postMessage([ data, user_unit ]);
                dataWorker.port.onmessage = function(e) {
                    console.log("data have been computed", e.data);
                    that.renderGraphs(e.data[0], e.data[1]);
                    that.renderMap();
                };
                console.log("dataWorker.port", dataWorker.port);
            }
        }
    },
    dataCompute: function(data, user_unit) {
        var scale;
        if (user_unit === "metric") {
            scale = 1e3;
        } else {
            scale = 1609;
        }
        var complete_data = data.reduce(function(a, b) {
            return a.concat(b);
        });
        var previous = {
            date: complete_data[0].date,
            time: 0,
            climb: 0,
            speed: 0,
            altitude: 0,
            distance: 0
        };
        var summary_data = complete_data.map(function(value, index) {
            if (value.cumulDistance === 0 || value.cumulDistance >= previous.distance + scale) {
                var time = (new Date(value.date).valueOf() - new Date(previous.date).valueOf()) / 1e3;
                var speed = (value.cumulDistance - previous.distance) / (time / 1e3);
                if (isNaN(speed)) {
                    speed = 0;
                } else {
                    speed = utils.Helpers.speedMsToChoice(user_unit, speed).value;
                }
                var newbe = {
                    date: value.date,
                    distance: value.cumulDistance,
                    latitude: value.latitude,
                    longitude: value.longitude,
                    altitude: value.altitude,
                    time: time,
                    climb: value.altitude - previous.altitude,
                    speed: speed
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
        this.renderGraphs(complete_data, summary_data);
        this.renderMap();
    },
    renderMap: function() {
        console.log("rendering map");
        var map = this.model.get("map");
        var data = this.model.get("data");
        console.log("detail data", data[0][100]);
        if (map !== false) {
            utils.Map.initialize("session-map");
            utils.Map.getMap(data);
        }
    },
    renderGraphs: function(complete_data, summary_data) {
        console.log("rendering graphs");
        var user_unit = Preferences.get("unit");
        var scale;
        if (user_unit === "metric") {
            scale = 1e3;
        } else {
            scale = 1609;
        }
        var small_unit = utils.Helpers.distanceMeterToChoice("", 0, false).unit;
        var big_unit = utils.Helpers.distanceMeterToChoice(user_unit, 0, false).unit;
        var speed_unit = utils.Helpers.speedMsToChoice(user_unit, 0).unit;
        var geo_table = dc.dataTable("#geo_table");
        var alt_graph = dc.lineChart("#alt_graph");
        var alt_table = dc.dataTable("#alt_table");
        var speed_graph = dc.lineChart("#speed_graph");
        var speed_table = dc.dataTable("#speed_table");
        var complete_ndx = crossfilter(complete_data), distDim = complete_ndx.dimension(function(d) {
            return d.cumulDistance / scale;
        }), distMin = 0, distMax = this.model.get("distance") / scale, altGroup = distDim.group().reduceSum(function(d) {
            return d.altitude;
        }), speedGroup = distDim.group().reduceSum(function(d) {
            return utils.Helpers.speedMsToChoice(user_unit, d.speed).value;
        });
        var summary_ndx = crossfilter(summary_data), summary_distDim = summary_ndx.dimension(function(d) {
            return d.distance;
        });
        geo_table.size(summary_data.length).dimension(summary_distDim).group(function() {
            return "";
        }).columns([ {
            label: "Distance (" + big_unit + ")",
            format: function(d) {
                return parseInt(utils.Helpers.distanceMeterToChoice(user_unit, d.distance, false).value, 0);
            }
        }, {
            label: "Duration",
            format: function(d) {
                var duration = utils.Helpers.formatDuration(d.time);
                return duration.hour + ":" + duration.min + ":" + duration.sec;
            }
        }, {
            label: "Latitude",
            format: function(d) {
                return d.latitude;
            }
        }, {
            label: "Longitude",
            format: function(d) {
                return d.longitude;
            }
        } ]);
        alt_graph.dimension(distDim).mouseZoomable(false).renderHorizontalGridLines(true).renderVerticalGridLines(true).brushOn(false).group(altGroup).title(function(d) {
            return "Distance: " + d.key.toFixed(2) + " " + big_unit + "\n" + "Altitude: " + d.value + " " + small_unit;
        }).x(d3.scale.linear().domain([ distMin, distMax ]));
        alt_table.size(summary_data.length).dimension(summary_distDim).group(function() {
            return "";
        }).columns([ {
            label: "Distance (" + big_unit + ")",
            format: function(d) {
                return parseInt(utils.Helpers.distanceMeterToChoice(user_unit, d.distance, false).value, 0);
            }
        }, {
            label: "Duration",
            format: function(d) {
                var duration = utils.Helpers.formatDuration(d.time);
                return duration.hour + ":" + duration.min + ":" + duration.sec;
            }
        }, {
            label: "Altitude (" + small_unit + ")",
            format: function(d) {
                return d.altitude;
            }
        }, {
            label: "Climb (" + small_unit + ")",
            format: function(d) {
                return d.climb;
            }
        } ]);
        speed_graph.dimension(distDim).mouseZoomable(false).renderHorizontalGridLines(true).renderVerticalGridLines(true).brushOn(false).group(speedGroup).title(function(d) {
            return "Distance: " + d.key.toFixed(2) + " " + big_unit + "\n" + "Speed: " + d.value + " " + speed_unit;
        }).x(d3.scale.linear().domain([ distMin, distMax ]));
        speed_table.size(summary_data.length).dimension(summary_distDim).group(function() {
            return "";
        }).columns([ {
            label: "Distance (" + big_unit + ")",
            format: function(d) {
                return parseInt(utils.Helpers.distanceMeterToChoice(user_unit, d.distance, false).value, 0);
            }
        }, {
            label: "Duration",
            format: function(d) {
                var duration = utils.Helpers.formatDuration(d.time);
                return duration.hour + ":" + duration.min + ":" + duration.sec;
            }
        }, {
            label: "Speed (" + speed_unit + ")",
            format: function(d) {
                return d.speed;
            }
        } ]);
        dc.renderAll();
        return this;
    }
});

"use strict";

var views = views || {};

views.detailled_3 = Backbone.NativeView.extend({
    el: "#session-view",
    session_id: "",
    template: microtemplate(document.getElementById("session-details-template-2").innerHTML),
    events: {
        "click #session-3-delete": "deleteSession"
    },
    initialize: function() {
        this.render();
    },
    render: function() {
        var user_unit = Preferences.get("unit");
        var dist = utils.Helpers.distanceMeterToChoice(user_unit, this.model.get("distance"), false);
        var speed = utils.Helpers.speedMsToChoice(user_unit, this.model.get("avg_speed"));
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        this.el.innerHTML = this.template({
            session_cid: this.model.get("session_cid"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            time: utils.Helpers.formatTime(this.model.get("date")),
            calories: this.model.get("calories"),
            distance: dist.value + " " + dist.unit,
            duration: duration.hour + ":" + duration.min + ":" + duration.sec,
            avg_speed: speed.value + " " + speed.unit,
            activity: this.model.get("activity")
        });
    },
    deleteSession: function(el) {
        var session = el.target.getAttribute("session_id");
        this.model.destroy({
            success: function(model, response) {
                console.log("deleteSession - success", model, response);
                Sessions.trigger("removed");
            },
            error: function(model, error) {
                console.log("deleteSession - error", model, error);
            }
        });
    }
});

"use strict";

var views = views || {};

views.new_1 = Backbone.NativeView.extend({
    template: microtemplate(document.getElementById("new-session-template-1").innerHTML),
    events: {
        "change #import-file": "enableImport",
        "click #import-btn": "importFile",
        "change #new-session-date": "__validateDate",
        "change #new-session-time": "__validateDate",
        "change #new-session-distance": "__validateDistance",
        "change #new-session-duration-hour": "__validateDuration",
        "change #new-session-duration-min": "__validateDuration",
        "change #new-session-duration-sec": "__validateDuration"
    },
    validated: {
        distance: false,
        duration: false,
        date: true
    },
    initialize: function() {
        this.listenTo(this.model, "import", this.renderImportedData);
    },
    importFile: function() {
        var reader = new FileReader();
        var that = this;
        reader.onloadend = function() {
            var p = new DOMParser();
            utils.GPX.importFile(p.parseFromString(reader.result, "text/xml"), function(result) {
                if (result.error) {
                    console.log("error while importing", result.res);
                } else {
                    var calories = utils.Helpers.calculateCalories(Preferences.get("gender"), Preferences.get("weight"), Preferences.get("height"), new Date().getFullYear() - Preferences.get("birthyear"), result.res.distance, result.res.duration, that.model.get("activity"));
                    result.res.calories = calories;
                    that.model.set(result.res);
                    that.model.trigger("import");
                    console.log("new session imported", that.model.attributes);
                }
            });
        };
        reader.readAsText(document.getElementById("import-file").files[0]);
    },
    render: function() {
        this.validated.distance = true;
        this.validated.duration = true;
        var pref_unit = Preferences.get("unit");
        var distance = utils.Helpers.distanceMeterToChoice(pref_unit, this.model.get("distance"), false);
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var speed = utils.Helpers.speedMsToChoice(pref_unit, this.model.get("avg_speed"));
        this.el.innerHTML = this.template({
            lb_import_file: _("import-gpx-file"),
            lb_import: _("import"),
            lb_date: _("date-format"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            lb_time: _("start-time-format"),
            time: utils.Helpers.formatTime(this.model.get("date")),
            lb_distance: _("distance-format"),
            distance_unit: distance.unit,
            distance: distance.value,
            lb_duration: _("duration-format"),
            durationH: duration.hour,
            durationM: duration.min,
            durationS: duration.sec,
            lb_alt_max: _("altitude-max"),
            alt_max: this.model.get("alt_max"),
            lb_alt_min: _("altitude-min"),
            alt_min: this.model.get("alt_min"),
            alt_unit: "m",
            lb_avg_speed: _("average-speed"),
            avg_speed: speed.value,
            speed_unit: speed.unit,
            lb_calories: _("calories"),
            calories: this.model.get("calories"),
            lb_map: _("map")
        });
        return this;
    },
    renderImportedData: function() {
        this.validated.distance = true;
        this.validated.duration = true;
        var pref_unit = Preferences.get("unit");
        var distance = utils.Helpers.distanceMeterToChoice(pref_unit, this.model.get("distance"), false);
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var speed = utils.Helpers.speedMsToChoice(pref_unit, this.model.get("avg_speed"));
        document.getElementById("new-session-date").value = utils.Helpers.formatDate(this.model.get("date"));
        document.getElementById("new-session-time").value = utils.Helpers.formatTime(this.model.get("date"));
        document.getElementById("new-session-distance").value = distance.value;
        document.getElementById("new-session-duration-hour").value = duration.hour;
        document.getElementById("new-session-duration-min").value = duration.min;
        document.getElementById("new-session-duration-sec").value = duration.sec;
        document.getElementById("new-session-alt-max").value = this.model.get("alt_max");
        document.getElementById("new-session-alt-min").value = this.model.get("alt_min");
        document.getElementById("new-session-avg-speed").value = speed.value;
        document.getElementById("new-session-calories").value = this.model.get("calories");
    },
    enableImport: function() {
        var file_list = document.getElementById("import-file").files;
        if (file_list.length > 0) {
            document.getElementById("import-btn").removeAttribute("disabled");
        } else {
            document.getElementById("import-btn").setAttribute("disabled", "disabled");
        }
    },
    renderCalories: function() {
        var calories = utils.Helpers.calculateCalories(Preferences.get("gender"), Preferences.get("weight"), Preferences.get("height"), new Date().getFullYear() - Preferences.get("birthyear"), this.model.get("distance"), this.model.get("duration"), this.model.get("activity"));
        document.getElementById("new-session-calories").value = calories;
        this.model.set("calories", calories);
    },
    renderAvgSpeed: function() {
        var speed = this.model.get("distance") / this.model.get("duration");
        document.getElementById("new-session-avg-speed").value = utils.Helpers.speedMsToChoice(Preferences.get("unit"), speed).value;
        this.model.set("avg_speed", speed);
    },
    __validateDuration: function() {
        var h = parseInt(document.getElementById("new-session-duration-hour").value, 10);
        var m = parseInt(document.getElementById("new-session-duration-min").value, 10);
        var s = parseInt(document.getElementById("new-session-duration-sec").value, 10);
        if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) {
            this.validated.duration = false;
            this.trigger("disable-add");
        } else if (h >= 0 || h <= 24 && m >= 0 || m <= 60 && s >= 0 || s <= 60) {
            this.model.set("duration", h * 3600 + m * 60 + s);
            this.validated.duration = true;
            console.log("sending enable-add", this.validated);
            this.trigger("enable-add");
            if (this.validated.distance) {
                this.renderCalories();
                this.renderAvgSpeed();
            }
        } else {
            this.validated.duration = false;
            console.log("sending disable-add", this.validated);
            this.trigger("disable-add");
        }
    },
    __validateDate: function() {
        var date = utils.Helpers.checkDate(document.getElementById("new-session-date").value);
        var time = utils.Helpers.checkTime(document.getElementById("new-session-time").value);
        if (date[0] && time[0]) {
            this.validated.date = true;
            console.log("sending enable-add", this.validated);
            this.trigger("enable-add");
            var d = date[1];
            var t = time[1];
            this.model.set("date", new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]));
        } else {
            this.validated.date = false;
            console.log("sending disable-add", this.validated);
            this.trigger("disable-add");
        }
    },
    __validateDistance: function() {
        var d = parseFloat(document.getElementById("new-session-distance").value);
        if (Number.isNaN(d)) {
            this.validated.distance = false;
            console.log("sending disable-add", this.validated);
            this.trigger("disable-add");
        } else {
            this.model.set("distance", utils.Helpers.distanceChoiceToMeter(Preferences.get("unit"), d));
            this.validated.distance = true;
            this.trigger("enable-add");
            console.log("sending enable-add", this.validated);
            if (this.validated.duration) {
                this.renderCalories();
                this.renderAvgSpeed();
            }
        }
    }
});

"use strict";

var views = views || {};

views.new_3 = Backbone.NativeView.extend({
    template: microtemplate(document.getElementById("new-session-template-3").innerHTML),
    events: {
        "change #new-session-date": "__validateDate",
        "change #new-session-time": "__validateDate",
        "change #new-session-distance": "__validateDistance",
        "change #new-session-duration-hour": "__validateDuration",
        "change #new-session-duration-min": "__validateDuration",
        "change #new-session-duration-sec": "__validateDuration"
    },
    validated: {
        distance: false,
        duration: false,
        date: true
    },
    initialize: function() {},
    render: function() {
        this.validated.distance = true;
        this.validated.duration = true;
        var pref_unit = Preferences.get("unit");
        var distance = utils.Helpers.distanceMeterToChoice(pref_unit, this.model.get("distance"), false);
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var speed = utils.Helpers.speedMsToChoice(pref_unit, this.model.get("avg_speed"));
        this.el.innerHTML = this.template({
            lb_date: _("date-format"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            lb_time: _("start-time-format"),
            time: utils.Helpers.formatTime(this.model.get("date")),
            lb_distance: _("distance-format"),
            distance: distance.value,
            distance_unit: distance.unit,
            lb_duration: _("duration-format"),
            durationH: duration.hour,
            durationM: duration.min,
            durationS: duration.sec,
            lb_avg_speed: _("average-speed"),
            avg_speed: speed.value,
            speed_unit: speed.unit,
            lb_calories: _("calories"),
            calories: this.model.get("calories")
        });
        console.log("new view rendered");
        return this;
    },
    renderCalories: function() {
        var calories = utils.Helpers.calculateCalories(Preferences.get("gender"), Preferences.get("weight"), Preferences.get("height"), new Date().getFullYear() - Preferences.get("birthyear"), this.model.get("distance"), this.model.get("duration"), this.model.get("activity"));
        document.getElementById("new-session-calories").value = calories;
        this.model.set("calories", calories);
    },
    renderAvgSpeed: function() {
        var speed = this.model.get("distance") / this.model.get("duration");
        document.getElementById("new-session-avg-speed").value = utils.Helpers.speedMsToChoice(Preferences.get("unit"), speed).value;
        this.model.set("avg_speed", speed);
    },
    __validateDuration: function() {
        var h = parseInt(document.getElementById("new-session-duration-hour").value, 10);
        var m = parseInt(document.getElementById("new-session-duration-min").value, 10);
        var s = parseInt(document.getElementById("new-session-duration-sec").value, 10);
        if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) {
            this.validated.duration = false;
            this.trigger("disable-add");
        } else if (h >= 0 || h <= 24 && m >= 0 || m <= 60 && s >= 0 || s <= 60) {
            this.model.set("duration", h * 3600 + m * 60 + s);
            this.validated.duration = true;
            this.trigger("enable-add");
            if (this.validated.distance) {
                this.renderCalories();
                this.renderAvgSpeed();
            }
        } else {
            this.validated.duration = false;
            this.trigger("disable-add");
        }
    },
    __validateDate: function() {
        var date = utils.Helpers.checkDate(document.getElementById("new-session-date").value);
        var time = utils.Helpers.checkTime(document.getElementById("new-session-time").value);
        if (date[0] && time[0]) {
            this.validated.date = true;
            this.trigger("enable-add");
            var d = date[1];
            var t = time[1];
            this.model.set("date", new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]));
        } else {
            this.validated.date = false;
            this.trigger("disable-add");
        }
    },
    __validateDistance: function() {
        var d = parseFloat(document.getElementById("new-session-distance").value);
        if (Number.isNaN(d)) {
            this.validated.distance = false;
            this.trigger("disable-add");
        } else {
            this.model.set("distance", utils.Helpers.distanceChoiceToMeter(Preferences.get("unit"), d));
            this.validated.distance = true;
            this.trigger("enable-add");
            if (this.validated.duration) {
                this.renderCalories();
                this.renderAvgSpeed();
            }
        }
    }
});

"use strict";

var views = views || {};

views.new_4 = Backbone.NativeView.extend({
    template: microtemplate(document.getElementById("new-session-template-4").innerHTML),
    events: {
        "change #new-session-date": "__validateDate",
        "change #new-session-time": "__validateDate",
        "change #new-session-duration-hour": "__validateDuration",
        "change #new-session-duration-min": "__validateDuration",
        "change #new-session-duration-sec": "__validateDuration"
    },
    validated: {
        duration: false,
        date: true
    },
    render: function() {
        this.validated.distance = true;
        this.validated.duration = true;
        var pref_unit = Preferences.get("unit");
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        this.el.innerHTML = this.template({
            lb_date: _("date-format"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            lb_time: _("start-time-format"),
            time: utils.Helpers.formatTime(this.model.get("date")),
            lb_duration: _("duration-format"),
            durationH: duration.hour,
            durationM: duration.min,
            durationS: duration.sec,
            lb_calories: _("calories"),
            calories: this.model.get("calories")
        });
        console.log("new view rendered");
        return this;
    },
    renderCalories: function() {
        var calories = utils.Helpers.calculateCalories(Preferences.get("gender"), Preferences.get("weight"), Preferences.get("height"), new Date().getFullYear() - Preferences.get("birthyear"), 0, this.model.get("duration"), this.model.get("activity"));
        document.getElementById("new-session-calories").value = calories;
        this.model.set("calories", calories);
    },
    __validateDate: function() {
        var date = utils.Helpers.checkDate(document.getElementById("new-session-date").value);
        var time = utils.Helpers.checkTime(document.getElementById("new-session-time").value);
        if (date[0] && time[0]) {
            this.validated.date = true;
            this.trigger("enable-add");
            var d = date[1];
            var t = time[1];
            this.model.set("date", new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]));
        } else {
            this.validated.date = false;
            this.trigger("disable-add");
        }
    },
    __validateDistance: function() {
        var d = parseFloat(document.getElementById("new-session-distance").value);
        if (Number.isNaN(d)) {
            this.validated.distance = false;
            this.trigger("disable-add");
        } else {
            this.model.set("distance", utils.Helpers.distanceChoiceToMeter(Preferences.get("unit"), d));
            this.validated.distance = true;
            this.trigger("enable-add");
            if (this.validated.duration) {
                this.renderCalories();
                this.renderAvgSpeed();
            }
        }
    }
});

"use strict";

var views = views || {};

views.sessions_summary_1 = Backbone.NativeView.extend({
    tagName: "li",
    template: microtemplate(document.getElementById("session-summary-template-1").innerHTML),
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(Preferences, "change", this.render);
    },
    extend: Backbone.Events,
    render: function() {
        var dist = utils.Helpers.distanceMeterToChoice(Preferences.get("unit"), this.model.get("distance"), false);
        var speed = utils.Helpers.speedMsToChoice(Preferences.get("unit"), this.model.get("avg_speed"));
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var activity = this.model.get("activity");
        this.el.innerHTML = this.template({
            session_cid: this.model.get("session_cid"),
            collection: this.model.get("collection"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            calories: this.model.get("calories"),
            distance: dist.value + " " + dist.unit,
            duration: duration.hour + ":" + duration.min + ":" + duration.sec,
            avg_speed: speed.value + " " + speed.unit,
            activity: activity,
            icon_path: "img/" + this.model.get("type") + "/" + this.model.get("family") + "/" + activity + ".png"
        });
        return this;
    }
});

"use strict";

var views = views || {};

views.sessions_summary_3 = Backbone.NativeView.extend({
    tagName: "li",
    template: microtemplate(document.getElementById("session-summary-template-3").innerHTML),
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.remove);
        this.listenTo(Preferences, "change", this.render);
    },
    extend: Backbone.Events,
    render: function() {
        var duration = utils.Helpers.formatDuration(this.model.get("duration"));
        var activity = this.model.get("activity");
        this.el.innerHTML = this.template({
            session_cid: this.model.get("session_cid"),
            collection: this.model.get("collection"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            calories: this.model.get("calories"),
            duration: duration.hour + ":" + duration.min + ":" + duration.sec,
            activity: activity,
            icon_path: "img/" + this.model.get("type") + "/" + this.model.get("family") + "/" + activity + ".png"
        });
        return this;
    }
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.bmx = {
    model: models.cycling,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "bmx",
    family: "cycling"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.climbing = {
    model: models.mountaineering,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "climbing",
    family: "mountaineering"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.football = {
    model: models.team,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "football",
    family: "team"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.frisbee = {
    model: models.team,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "frisbee",
    family: "team"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.handball = {
    model: models.team,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "handball",
    family: "team"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.in_sea = {
    model: models.sliding,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "in_sea",
    family: "sliding"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.kicking = {
    model: models.fighting,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "kicking",
    family: "fighting"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.kitesurfing = {
    model: models.sliding,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "kitesurfing",
    family: "sliding"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.mountain_biking = {
    model: models.cycling,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "mountain_biking",
    family: "cycling"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.paddling = {
    model: models.watersports,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "paddling",
    family: "watersports"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.ping_pong = {
    model: models.net,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "ping_pong",
    family: "net"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.punching = {
    model: models.fighting,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "punching",
    family: "fighting"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.racing = {
    model: models.athletics,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "racing",
    family: "athletics"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.regular_biking = {
    model: models.cycling,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "regular_biking",
    family: "cycling"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.roller_skating = {
    model: models.sliding,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "roller_skating",
    family: "sliding"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.running = {
    model: models.athletics,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "running",
    family: "athletics"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.skateboarding = {
    model: models.sliding,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "skateboarding",
    family: "sliding"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.skiing = {
    model: models.sliding,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "skiing",
    family: "sliding"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.sparring = {
    model: models.fighting,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "sparring",
    family: "fighting"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.stick_fighting = {
    model: models.fighting,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "stick_fighting",
    family: "fighting"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.sup = {
    model: models.watersports,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "sup",
    family: "watersports"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.surfing = {
    model: models.sliding,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "surfing",
    family: "sliding"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.swimming = {
    model: models.swimming,
    new_view: views.new_3,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "swimming",
    family: "swimming"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.tennis = {
    model: models.net,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "tennis",
    family: "net"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.time_trial_biking = {
    model: models.cycling,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "time_trial_biking",
    family: "cycling"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.trekking = {
    model: models.mountaineering,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "trekking",
    family: "mountaineering"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.walking = {
    model: models.mountaineering,
    new_view: views.new_1,
    summary_view_dashboard: views.dashboard_summary_1,
    summary_view_sessions: views.sessions_summary_1,
    detailled_view: views.detailled_1
};

activities.list.push({
    activity: "walking",
    family: "mountaineering"
});

"use strict";

var activities = activities || {};

activities.list = activities.list || [];

var models = models || {};

var views = views || {};

activities.wrestling = {
    model: models.fighting,
    new_view: views.new_4,
    summary_view_dashboard: views.dashboard_summary_3,
    summary_view_sessions: views.sessions_summary_3,
    detailled_view: views.detailled_3
};

activities.list.push({
    activity: "wrestling",
    family: "fighting"
});

"use strict";

var body_weight = body_weight || {};

var models = models || {};

models.body_weight = function(options) {
    this.type = options.type || "body_weight";
    this.activity = options.activity || "";
    this.date = options.date || new Date().toISOString();
    this.value = options.value || 0;
};

var views = views || {};

body_weight = {
    model: models.body_weight,
    new_view: views.new_2,
    summary_view_dashboard: views.dashboard_summary_2,
    summary_view_sessions: views.dashboard_summary_2,
    detailled_view: views.detailled_2
};

"use strict";

var messages = messages || {};

var models = models || {};

var views = views || {};

messages.message = {
    model: models.message,
    summary_view_dashboard: views.dashboard_message,
    detailled_view: views.detailled_message
};

"use strict";

var Factory = function() {
    var getModel = function(type, activity, options) {
        var Model;
        if (type === "session") {
            Model = activities[activity].model;
        } else if (type === "body") {
            Model = body_weight[activity].model;
        } else if (type === "message") {
            Model = messages[activity].model;
        }
        return Model ? new Model(options) : null;
    };
    var getNewView = function(type, model) {
        var View;
        if (type === "session") {
            View = activities[model.get("activity")].new_view;
        } else if (type === "body") {
            View = body_weight[model.get("activity")].new_view;
        } else if (type === "message") {
            View = messages[model.get("activity")].new_view;
        }
        return new View({
            model: model
        });
    };
    var getDashboardSummaryView = function(model) {
        var View;
        var type = model.get("type");
        if (type === "session") {
            View = activities[model.get("activity")].summary_view_dashboard;
        } else if (type === "body_weight") {
            View = body_weight.summary_view_dashboard;
        } else if (type === "message") {
            View = messages[model.get("activity")].summary_view_dashboard;
        }
        return new View({
            model: model
        });
    };
    var getSessionsSummaryView = function(model) {
        var View = activities[model.get("activity")].summary_view_sessions;
        return new View({
            model: model
        });
    };
    var getDetailledView = function(type, model) {
        var View;
        if (type === "session") {
            View = activities[model.get("activity")].detailled_view;
        } else if (type === "body") {
            View = body_weight[model.get("activity")].detailled_view;
        } else if (type === "message") {
            View = messages[model.get("activity")].detailled_view;
        }
        return new View({
            model: model
        });
    };
    var getActivitiesList = function() {
        return activities.list;
    };
    var getBodiesList = function() {
        return body_weight.list;
    };
    return {
        getModel: getModel,
        getNewView: getNewView,
        getDashboardSummaryView: getDashboardSummaryView,
        getSessionsSummaryView: getSessionsSummaryView,
        getDetailledView: getDetailledView,
        getActivitiesList: getActivitiesList,
        getBodiesList: getBodiesList
    };
}();

"use strict";

var Message = Backbone.Model.extend({
    idAttribute: "_id",
    initialize: function() {}
});

"use strict";

var Session = Backbone.Model.extend({
    idAttribute: "_id"
});

"use strict";

var BodyWeight = Backbone.Model.extend({
    idAttribute: "_id"
});

"use strict";

var Item = Backbone.Model.extend({
    idAttribute: "_id",
    save: false
});

"use strict";

var preferencesmodel = Backbone.Model.extend({
    urlRoot: "preferences",
    idAttribute: "_id",
    initialize: function() {}
});

var Preferences = new preferencesmodel({
    parse: true
});

"use strict";

var MessagesCollection = Backbone.Collection.extend({
    model: Message,
    url: "messages",
    initialize: function() {
        this.listenTo(this, "sync", this.synced);
    },
    synced: function(ev, res) {
        if (ev.length === 0) {
            console.log("adding the welcome message");
            var welcome = Factory.getModel("message", "message", {
                activity: "message",
                date: new Date().toISOString(),
                text: "Welcome to Run, Bike, Hike..."
            });
            var m = this.add(welcome);
            m.save();
        }
    }
});

var Messages = new MessagesCollection();

"use strict";

var SessionsCollection = Backbone.Collection.extend({
    model: Session,
    url: "sessions",
    initialize: function() {}
});

var Sessions = new SessionsCollection();

"use strict";

var BodyWeightCollection = Backbone.Collection.extend({
    model: BodyWeight,
    url: "body_weight",
    initialize: function() {}
});

var BodyWeights = new BodyWeightCollection();

"use strict";

var DashboardCollection = Backbone.Collection.extend({
    model: Item,
    url: "dashboard"
});

var Dashboard = new DashboardCollection();

"use strict";

var DashboardView = Backbone.NativeView.extend({
    el: "#dashboard",
    events: {
        "click .session-summary-click": "itemSelected"
    },
    viewsList: [],
    sortAscending: false,
    sortAttribute: "date",
    sortIt: function(ev, res) {
        console.log("sortIt", ev, res);
    },
    initialize: function() {
        this.collection = Dashboard;
        this.listenTo(Messages, "sync", this.resync);
        this.listenTo(Sessions, "sync", this.resync);
        this.listenTo(BodyWeights, "sync", this.resync);
        this.listenTo(this.collection, "sync", this.render);
        this.listenTo(this.collection, "reset", this.render);
        var that = this;
        document.getElementById("dashboard-sort-attribute").addEventListener("change", function(ev) {
            that.sortAttribute = ev.target.value;
            that.sortCollection();
        });
        document.getElementById("dashboard-sort-ascending").addEventListener("change", function(ev) {
            if (ev.target.value === "false") {
                that.sortAscending = false;
            } else {
                that.sortAscending = true;
            }
            that.sortCollection();
        });
        this.sortCollection();
    },
    resync: function(ev, res) {
        this.collection.reset();
        Messages.forEach(function(item) {
            this.collection.add(item);
        }, this);
        Sessions.forEach(function(item) {
            this.collection.add(item);
        }, this);
        BodyWeights.forEach(function(item) {
            this.collection.add(item);
        }, this);
        this.sortCollection();
    },
    sortCollection: function() {
        if (this.collection.length !== 0) {
            var that = this;
            console.log("sorting collection by", this.sortAttribute, this.sortAscending);
            this.collection.comparator = function(doc) {
                var activity = doc.get("activity");
                var timestamp = doc.get("date");
                if (!that.sortAscending) {
                    if (that.sortAttribute === "date") {
                        return that.negateString(timestamp);
                    } else if (that.sortAttribute === "activity") {
                        return that.negateString(that.negateString(activity) + "-" + that.negateString(timestamp));
                    }
                } else {
                    if (that.sortAttribute === "date") {
                        return timestamp;
                    } else if (that.sortAttribute === "activity") {
                        return that.negateString(activity) + "-" + timestamp;
                    }
                }
            };
            this.collection.sort();
            console.log("collection has been sorted", this.collection);
            this.render();
        }
    },
    negateString: function(s) {
        s = s.toLowerCase();
        s = s.split("");
        s = s.map(function(letter) {
            return String.fromCharCode(-letter.charCodeAt(0));
        });
        return s.join("");
    },
    addEntry: function() {
        this.collection.forEach(function(item) {
            this.renderItem(item);
        }, this);
    },
    renderItem: function(item) {
        var view = Factory.getDashboardSummaryView(item);
        this.listenTo(view, "dashboard-item-selected", this.itemSelected);
        this.el.appendChild(view.render().el);
        this.viewsList.push(view);
    },
    render: function() {
        if (this.collection.length !== 0) {
            if (this.el.innerHTML !== "") {
                this.viewsList.forEach(function(view) {
                    view.remove();
                });
                this.viewsList = [];
            }
            this.collection.forEach(function(item) {
                this.renderItem(item);
            }, this);
        }
    },
    itemSelected: function(item) {
        var entry_cid = item.target.getAttribute("session_id");
        this.viewsList.forEach(function(view) {
            if (view.model.cid === entry_cid) {
                this.collection.trigger("dashboard-entry-selected", view.model);
            }
        }, this);
    }
});

"use strict";

var IndicatorsView = Backbone.NativeView.extend({
    el: "#indicators",
    template: microtemplate(document.getElementById("indicators-template").innerHTML),
    initialize: function() {
        this.collection = Dashboard;
        this.listenTo(this.collection, "add", this.render);
        this.listenTo(this.collection, "sync", this.render);
        this.listenTo(Preferences, "change", this.render);
        this.render();
    },
    render: function() {
        var totals = {
            sessions: 0,
            calories: 0,
            distance: 0,
            duration: 0
        };
        if (this.collection.length !== 0) {
            var sessions = this.collection.where({
                type: "session"
            });
            sessions.forEach(function(item) {
                totals.sessions += 1;
                totals.calories += parseInt(item.get("calories"), 10);
                totals.distance += parseFloat(item.get("distance"), 10);
                totals.duration += parseInt(item.get("duration"), 10);
            });
        }
        var dist = utils.Helpers.distanceMeterToChoice(Preferences.get("unit"), totals.distance, false);
        var duration = utils.Helpers.formatDuration(totals.duration);
        this.el.innerHTML = this.template({
            sessions: totals.sessions,
            calories: totals.calories,
            distance: dist.value + " " + dist.unit,
            duration: duration.hour + ":" + duration.min + ":" + duration.sec
        });
        return this;
    }
});

"use strict";

var ModalView = Backbone.NativeView.extend({
    el: "#modal",
    template: microtemplate(document.getElementById("modal-delete-template").innerHTML),
    events: {
        "click #btn-confirm-delete": "deleteConfirmed",
        "click #btn-cancel-delete": "hideModal"
    },
    initialize: function() {
        this.render();
    },
    render: function() {
        this.el.setAttribute("disabled", "false");
        this.el.className = "modal";
        this.el.innerHTML = this.template({
            session_cid: this.model.get("session_cid"),
            name: this.model.get("name")
        });
        return this;
    },
    deleteConfirmed: function() {
        var that = this;
        this.model.destroy({
            success: function(model, response) {
                console.log("deleteSession - success", model, response);
                Sessions.trigger("removed");
                that.hideModal();
            },
            error: function(model, error) {
                console.log("deleteSession - error", model, error);
            }
        });
    },
    hideModal: function() {
        this.el.setAttribute("disabled", "true");
        this.el.className = "modal hidden";
    }
});

"use strict";

var NewSession = Backbone.NativeView.extend({
    el: "#new-session-view",
    model: new Session(),
    subview: "",
    events: {
        "click #select-activity": "activitySelected",
        "click #confirm-add-session-btn": "addNewSession"
    },
    dom: {
        activity: document.getElementById("new-activity-details")
    },
    template: microtemplate(document.getElementById("new-session-activity").innerHTML),
    initialize: function() {
        document.getElementById("select-activity").innerHTML = "";
        var activities = Factory.getActivitiesList();
        for (var i = 0; i < activities.length; i++) {
            this.renderIcon(activities[i]);
        }
    },
    renderIcon: function(activity) {
        var label = document.createElement("label");
        label.setAttribute("for", activity.activity);
        var input = document.createElement("input");
        input.setAttribute("type", "radio");
        input.setAttribute("name", "select-activity");
        input.setAttribute("value", activity.activity);
        input.setAttribute("id", activity.activity);
        var img = document.createElement("img");
        img.setAttribute("src", "img/session/" + activity.family + "/" + activity.activity + ".png");
        img.setAttribute("alt", activity.activity);
        label.appendChild(input);
        label.appendChild(img);
        document.getElementById("select-activity").appendChild(label);
    },
    activitySelected: function(element) {
        if (this.subview) {
            this.subview.remove();
        }
        if (element.target.nodeName === "INPUT") {
            var activity = element.target.value;
            var session = Factory.getModel("session", activity, {
                activity: activity
            });
            this.model.set(session);
            this.subview = Factory.getNewView("session", this.model);
            this.el.appendChild(document.createElement("div").innerHTML = this.subview.render().el);
            this.listenTo(this.subview, "enable-add", this.enableAdd);
            this.listenTo(this.subview, "disable-add", this.disableAdd);
        }
    },
    enableAdd: function() {
        var btn = document.getElementById("confirm-add-session-btn");
        console.log("enable-add", btn.getAttribute("disabled"));
        if (btn.getAttribute("disabled") === "disabled") {
            btn.removeAttribute("disabled");
        }
    },
    disableAdd: function() {
        var btn = document.getElementById("confirm-add-session-btn");
        console.log("disable-add", btn.getAttribute("disabled"));
        if (btn.getAttribute("disabled") === null) {
            btn.setAttribute("disabled", "disabled");
        }
    },
    addNewSession: function() {
        for (var i = 0; i < this.subview.validated.length; i++) {
            var criteria = this.subview.validated[i];
            if (!criteria) {
                return;
            }
        }
        var s = Sessions.add(this.model);
        console.log("new session to save", s);
        s.save();
        Sessions.trigger("add-new", s);
        this.subview.remove();
    }
});

"use strict";

var NewBodyWeightView = Backbone.NativeView.extend({
    el: "#new-body-weight-view",
    events: {
        "click #confirm-add-body-weight-btn": "addNewBody",
        "onsubmit #body-form": function() {
            return false;
        },
        "change #new-body-date": "__validateDate",
        "change #new-body-value": "__validateValue"
    },
    validated: {
        date: false,
        value: false
    },
    dom: {
        activity: document.getElementById("new-activity-details")
    },
    template: microtemplate(document.getElementById("new-session-template-2").innerHTML),
    initialize: function() {
        console.log("this.model", this.model);
        this.render();
    },
    render: function() {
        this.el.innerHTML = this.template({
            lb_date: _("date-format"),
            date: utils.Helpers.formatDate(this.model.get("date")),
            lb_weight: _("weight"),
            value: this.model.get("value")
        });
        return this;
    },
    __validateDate: function() {
        var date = utils.Helpers.checkDate(document.getElementById("new-body-date").value);
        if (date[0]) {
            this.validated.date = true;
            this.trigger("enable-add");
            var d = date[1];
            this.model.set("date", new Date(d[2], d[1] - 1, d[0]).toISOString());
        } else {
            this.validated.date = false;
            this.trigger("disable-add");
        }
    },
    __validateValue: function() {
        var v = parseFloat(document.getElementById("new-body-value").value);
        if (Number.isNaN(v)) {
            this.validated.value = false;
            this.trigger("disable-add");
        } else {
            this.validated.value = true;
            this.trigger("enable-add");
            this.model.set("value", v);
        }
    },
    addNewBody: function() {
        for (var i = 0; i < this.validated.length; i++) {
            var criteria = this.validated[i];
            if (!criteria) {
                return;
            }
        }
        console.log("addNewSession - this.model", this.model);
        var b = BodyWeights.add(this.model);
        b.save();
        BodyWeights.trigger("add-new", b);
        this.remove();
    }
});

"use strict";

var PreferencesView = Backbone.NativeView.extend({
    el: "#preferences-view",
    events: {
        "click #save-preferences-btn": "preferencesChanged"
    },
    dom: {
        language_select: document.getElementById("language"),
        unit_select: document.getElementById("unit"),
        gender_select: document.getElementById("gender"),
        birthyear_select: document.getElementById("birthyear"),
        height_input: document.getElementById("height"),
        weight_input: document.getElementById("weight"),
        save_btn: document.getElementById("save-preferences-btn")
    },
    initialize: function() {
        this.model = Preferences;
        this.render();
    },
    preferenceChanged: function(el) {
        var preference = el.target;
        if (preference.nodeName === "SELECT") {
            this.model.set(preference.id, preference[preference.selectedIndex].value);
        } else if (preference.nodeName === "INPUT") {
            this.model.set(preference.id, parseFloat(preference.value, 10));
        }
        document.webL10n.setLanguage(preference.value);
        this.model.save();
    },
    preferencesChanged: function() {
        this.model.set({
            language: this.dom.language_select[this.dom.language_select.selectedIndex].value,
            unit: this.dom.unit_select[this.dom.unit_select.selectedIndex].value,
            gender: this.dom.gender_select[this.dom.gender_select.selectedIndex].value,
            birthyear: parseInt(this.dom.birthyear_select[this.dom.birthyear_select.selectedIndex].value, 10),
            height: parseInt(this.dom.height_input.value, 10),
            weight: parseFloat(this.dom.weight_input.value, 2)
        });
        this.model.save();
    },
    render: function() {
        this.dom.language_select.value = this.model.get("language");
        this.dom.unit_select.value = this.model.get("unit");
        this.dom.gender_select.value = this.model.get("gender");
        this.dom.birthyear_select.value = this.model.get("birthyear");
        this.dom.height_input.value = this.model.get("height");
        this.dom.weight_input.value = this.model.get("weight");
    }
});

"use strict";

var SessionsView = Backbone.NativeView.extend({
    el: "#sessions-list",
    events: {
        "click .session-summary-click": "sessionSelected"
    },
    sessions: [],
    viewsList: [],
    sortAscending: false,
    sortAttribute: "date",
    initialize: function() {
        this.collection = Sessions;
        this.listenTo(this.collection, "sync", this.render);
        this.listenTo(this.collection, "reset", this.render);
        this.render();
        var that = this;
        document.getElementById("sessions-sort-attribute").addEventListener("change", function(ev) {
            that.sortAttribute = ev.target.value;
            that.sortCollection();
        });
        document.getElementById("sessions-sort-ascending").addEventListener("change", function(ev) {
            that.sortAscending = ev.target.value;
            that.sortCollection();
        });
    },
    sortCollection: function() {
        var that = this;
        this.collection.comparator = function(session) {
            var activity = session.get("activity");
            var timestamp = session.get("date");
            if (!that.sortAscending) {
                if (that.sortAttribute === "date") {
                    return that.negateString(timestamp);
                }
                if (that.sortAttribute === "activity") {
                    return that.negateString(that.negateString(activity) + "-" + that.negateString(timestamp));
                }
            } else {
                if (that.sortAttribute === "date") {
                    return timestamp;
                }
                if (that.sortAttribute === "activity") {
                    return that.negateString(activity) + "-" + timestamp;
                }
            }
        };
        this.collection.sort();
        this.render();
    },
    negateString: function(s) {
        s = s.toLowerCase();
        s = s.split("");
        s = s.map(function(letter) {
            return String.fromCharCode(-letter.charCodeAt(0));
        });
        return s.join("");
    },
    renderItem: function(item) {
        item.set("session_cid", item.cid);
        var view = Factory.getSessionsSummaryView(item);
        this.listenTo(item, "sessions-item-selected", this.sessionSelected);
        this.el.appendChild(view.render().el);
        this.viewsList.push(view);
    },
    render: function() {
        if (this.el.innerHTML !== "") {
            this.viewsList.forEach(function(view) {
                view.remove();
            });
            this.viewsList = [];
        }
        var sessions = this.collection.where({
            type: "session"
        });
        sessions.forEach(function(item) {
            this.renderItem(item);
        }, this);
    },
    sessionSelected: function(session) {
        var session_cid = session.target.getAttribute("session_id");
        console.log("click sessions", session_cid);
        this.viewsList.forEach(function(view) {
            console.log("view", view.model.cid);
            if (view.model.cid === session_cid) {
                this.collection.trigger("sessions-entry-selected", view.model);
            }
        }, this);
    }
});

"use strict";

var ReportsView = Backbone.NativeView.extend({
    el: "#reports-view",
    weightChart: dc.lineChart("#reports-weight-graph"),
    caloriesChart: dc.barChart("#reports-calories-graph"),
    initialize: function() {
        this.collection = Dashboard;
        this.listenTo(BodyWeights, "sync", this.render);
        var that = this;
        document.getElementById("reports-select-date").addEventListener("change", function(el) {
            console.log("select changed", el.target.value);
            var today = new Date();
            var first = new Date();
            first.setDate(1);
            var last = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            if (el.target.value === "current-year") {
                first.setMonth(0);
                last.setMonth(11);
                last.setDate(31);
            } else if (el.target.value === "last-12-months") {
                first.setMonth(today.getMonth() - 12);
            } else if (el.target.value === "last-6-months") {
                first.setMonth(today.getMonth() - 6);
            } else if (el.target.value === "last-3-months") {
                first.setMonth(today.getMonth() - 3);
            } else if (el.target.value === "current-month") {
                first.setMonth(today.getMonth() - 1);
            } else if (el.target.value === "current-week") {
                first = new Date();
                last = new Date();
                first.setDate(today.getDate() - today.getDay() + 1);
                first.setHours(0);
                last.setDate(today.getDate() + 7 - today.getDay());
                last.setHours(23);
            }
            console.log("first - last", first, last);
            that.weightChart.focus([ first, last ]);
            that.caloriesChart.focus([ first, last ]);
        });
    },
    render: function() {
        var user_unit = Preferences.get("unit");
        var red = "#FF0000";
        var blue = "#0000FF";
        var green = "#008000";
        var dateFormat = d3.time.format.iso;
        var act_data = [];
        var weight_data = [];
        var item;
        BodyWeights.forEach(function(model) {
            item = model.attributes;
            item.formateddate = dateFormat.parse(item.date);
            item.day = d3.time.day(item.formateddate);
            weight_data.push(item);
        });
        console.log("weight_data", weight_data);
        var ndx_weight = crossfilter(weight_data);
        var date_weight_dim = ndx_weight.dimension(function(d) {
            return d.day;
        });
        var weightGroup = date_weight_dim.group().reduceSum(function(d) {
            return parseFloat(d.value, 10);
        });
        this.weightChart.x(d3.time.scale().domain([ new Date(new Date().getFullYear(), 0, 1), new Date(new Date().getFullYear(), 11, 31) ])).dimension(date_weight_dim).renderHorizontalGridLines(true).renderVerticalGridLines(true).brushOn(false).mouseZoomable(false).yAxisLabel("Weight (kg)").colors(blue).group(weightGroup, "Weight");
        var ndx_act = crossfilter(act_data);
        var date_act_dim = ndx_act.dimension(function(d) {
            return d.month;
        });
        var caloriesGroup = date_act_dim.group().reduceSum(function(d) {
            return parseInt(d.calories, 10);
        });
        this.caloriesChart.x(d3.time.scale().domain([ new Date(new Date().getFullYear(), 0, 1), new Date(new Date().getFullYear(), 11, 31) ])).round(d3.time.month.round).xUnits(d3.time.days).renderHorizontalGridLines(true).renderVerticalGridLines(true).brushOn(false).mouseZoomable(false).yAxisLabel("Burned calories (kcal)").colors(red).dimension(date_act_dim).group(caloriesGroup);
        dc.renderAll();
    }
});

"use strict";

var NavigationView = Backbone.NativeView.extend({
    el: "nav",
    events: {
        "click #new-session-btn": "showNewSession",
        "click #new-body-weight-btn": "showNewBodyWeight",
        "click #dashboard-btn": "showDashboard",
        "click #sessions-btn": "showSessions",
        "click #reports-btn": "showReports",
        "click #preferences-btn": "showPreferences"
    },
    dom: {
        dashboard_view: document.getElementById("dashboard-view"),
        session_view: document.getElementById("session-view"),
        new_session_view: document.getElementById("new-session-view"),
        new_body_weight_view: document.getElementById("new-body-weight-view"),
        sessions_view: document.getElementById("sessions-view"),
        reports_view: document.getElementById("reports-view"),
        preference_view: document.getElementById("preferences-view"),
        dashboard_btn: document.getElementById("dashboard-btn"),
        new_session_btn: document.getElementById("new-session-btn"),
        new_body_weight_btn: document.getElementById("new-body-weight-btn"),
        sessions_btn: document.getElementById("sessions-btn"),
        reports_btn: document.getElementById("reports-btn"),
        preference_btn: document.getElementById("preferences-btn")
    },
    detailled_view: "",
    initialize: function() {
        this.active_section = this.dom.dashboard_view;
        this.active_button = this.dom.dashboard_btn;
        this.listenTo(Dashboard, "dashboard-entry-selected", this.showEntry);
        this.listenTo(Dashboard, "sessions-entry-selected", this.showSession);
        this.listenTo(Sessions, "add-new", this.showSession);
        this.listenTo(Sessions, "removed", this.showDashboard);
        this.listenTo(BodyWeights, "add-new", this.showDashboard);
    },
    showNewSession: function() {
        this._viewSection(this.dom.new_session_view, this.dom.new_session_btn);
    },
    showNewBodyWeight: function() {
        console.log("showNewBody");
        new NewBodyWeightView({
            model: new BodyWeight({
                type: "body_weight",
                activity: "",
                date: new Date().toISOString(),
                value: 0
            })
        });
        this._viewSection(this.dom.new_body_weight_view, this.dom.new_body_weight_btn);
    },
    showDashboard: function() {
        this._viewSection(this.dom.dashboard_view, this.dom.dashboard_btn);
    },
    showSessions: function() {
        this._viewSection(this.dom.sessions_view, this.dom.sessions_btn);
    },
    showReports: function() {
        this._viewSection(this.dom.reports_view, this.dom.reports_btn);
    },
    showPreferences: function() {
        new PreferencesView({
            model: Preferences
        });
        this._viewSection(this.dom.preference_view, this.dom.preference_btn);
    },
    showSession: function(model) {
        console.log("MAIN - will display model", model);
        var that = this;
        model.fetch({
            success: function(mod, res) {
                if (that.detailled_view !== "") {
                    that.detailled_view.remove();
                }
                var type = mod.get("type");
                that.detailled_view = Factory.getDetailledView(type, mod);
                that._viewSection(that.dom.session_view, that.dom.session_btn);
            },
            error: function(model, response) {
                console.log("error", model, response);
            }
        });
    },
    showEntry: function(model) {
        console.log("dashboard entry selected", model);
        var type = model.get("type");
        if (type === "session") {
            this.showSession(model);
        } else if (type === "body") {
            this.detailled_view = Factory.getDetailledView(model);
            this._viewSection(this.dom.session_view, this.dom.session_btn);
        } else {
            console.log("other types of dashboard entries are not managed");
        }
    },
    _viewSection: function(section, button) {
        console.log("viewSection", section);
        if (section !== this.active_section) {
            this.active_section.setAttribute("disabled", "true");
            section.setAttribute("disabled", "false");
            this.active_section = section;
            if (button) {
                this.active_button.className = "";
                button.className = "active";
                this.active_button = button;
            }
        }
    }
});

"use strict";

var Router = Backbone.Router.extend({
    routes: {
        "": "start"
    },
    start: function() {
        Preferences.fetch();
        Messages.fetch();
        Sessions.fetch();
        BodyWeights.fetch();
        new NavigationView();
        new DashboardView();
        new IndicatorsView();
        new SessionsView();
        new ReportsView();
        new NewSession();
    }
});

"use strict";

document.addEventListener("DOMContentLoaded", function() {
    var _ = document.webL10n.get;
    console.log("launching");
    new Router();
    Backbone.history.start();
}, false);