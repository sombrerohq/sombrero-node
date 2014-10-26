'use strict';

var Peer = require('./peer');
var Skiff = require('skiff');
var inherits = require('util').inherits;
var propagate = require('propagate');
var EventEmitter = require('events').EventEmitter;

module.exports = Node;

function Node(skiffURL, options) {
  if (!(this instanceof Node)) {
    return new Node(skiffURL, options);
  }

  if (!skiffURL) {
    throw new Error('need skiff URL');
  }

  EventEmitter.call(this);

  this.skiff = Skiff(skiffURL, options);
  propagate(this.skiff, this);

  this._remotes = {};
}

inherits(Node, EventEmitter);

var N = Node.prototype;

N.put = function put(key, value, callback) {
  this._call('put', key, value, callback);
};

N.get = function get(key, callback) {
  this._call('get', key, callback);
};

N._call = function _call(methodName) {
  var self = this;

  var method = this.skiff[methodName];
  var args = Array.prototype.slice.call(arguments);
  args.shift();

  var cb = args[args.length - 1];
  if (typeof cb != 'function') {
    cb = undefined;
  }
  if (cb) {
    args.pop();
  }
  args.push(replied);
  method.apply(this.skiff, args);

  function replied(err) {
    if (!err || !err.leader) {
      if (cb) {
        cb.apply(null, arguments);
      } else {
        self.emit('error', err);
      }
    } else {
      var remoteArgs = args.slice();
      remoteArgs.unshift(err.leader);
      self._remoteCall.apply(self, remoteArgs);
    }
  }
};

N._remoteCall = function _remoteCall(node) {
  var remote = this._remote(node);
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  remote.apply(remote, args);
};

N._remote = function _remote(node) {
  var remote = this._remotes[node];
  if (!remote) {
    remote = this._remotes[node] = Peer(node);
  }
  return remote;
};
