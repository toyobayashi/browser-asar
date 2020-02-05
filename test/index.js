/* eslint-disable no-path-concat */
console.log('======== ' + __filename + ' ========');
console.log('main starting');
var a = require('a');
var b = require('b');
console.log('in main, a.done = ' + a.done + ', b.done = ' + b.done + '');
console.log('******** ' + __filename + ' ********');
console.log(require('./package'));
console.log(require('json'));
console.log(module);
console.log(require('path'));
