'use strict';

module.exports = Server;

function Server(skiff) {
  if (!(this instanceof Server)) {
    return new Server(skiff);
  }

  this.skiff = skiff;
}

var S = Server.prototype;

S.put = function put(key, value, options, cb) {
  this.skiff.put(key, value, options, cb);
};

S.del = function del(key, options, cb) {
  this.skiff.del(key, options, cb);
};

S.batch = function del(key, options, cb) {
  this.skiff.batch(key, options, cb);
};

Server.methods = Object.keys(S);
