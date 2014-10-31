'use strict';

var URL = require('url');
var Peer = require('./peer');
var Skiff = require('skiff');
var Gossip = require('sombrero-gossip');
var Server = require('./server');
var extend = require('xtend');
var inherits = require('util').inherits;
var propagate = require('propagate');
var EventEmitter = require('events').EventEmitter;
var defaultOptions = require('./default_options');
var BatchWriteStream = require('batch-write-stream');

module.exports = Node;

function Node(skiffURL, options) {
  if (!(this instanceof Node)) {
    return new Node(skiffURL, options);
  }

  EventEmitter.call(this);

  var self = this;

  options = extend({}, defaultOptions, options);

  var url = URL.parse(skiffURL);
  this.metadata = {
    gossipPort: options.gossip.port,
    hostname: url.hostname,
    port: options.port
  };
  options.skiff.metadata = this.metadata;

  this._options = options;

  if (!skiffURL) {
    throw new Error('need skiff URL');
  }
  this.id = skiffURL;

  this.skiff = Skiff(skiffURL, options.skiff);

  this.skiff.on('joined', onPeerJoined);
  this.skiff.on('reconnected', onPeerJoined);
  function onPeerJoined(peer) {
    if (peer && peer.id != self.id &&
      peer.metadata && peer.metadata.gossipPort) {
      self.gossip.addPeer({
        id: peer.id,
        hostname: peer.metadata.hostname,
        port: peer.metadata.gossipPort
      });
    }
  }

  this.skiff.on('leader', onLeader);
  function onLeader() {
    self._gossipLeader(self.id);
  }

  this.skiff.on('left', function(peer) {
    self.gossip.removePeer(peer.id);
  });

  propagate(this.skiff, this);

  this._remotes = {};

  this._levelServer = Server(this.skiff);
  this._transportServer = options.transport.listen(
    options.port, options.hostname, this._levelServer, listening);

  this.gossip = Gossip(this._options.gossip);
  this.gossip.on('error', function(err) {
    self.emit('error', err);
  });
  this.gossip.on('cluster change', function(change) {
    self.emit('cluster change', change);
  });

  function listening(err) {
    if (err) {
      self.emit('error', err);
    }
  }
}

inherits(Node, EventEmitter);

var N = Node.prototype;

N.put = function put(key, value, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  options = this._waitForNode(options);
  this._call('put', key, value, options, callback);
};

N.get = function get(key, options, callback) {
  this._call('get', key, options, callback);
};

N.del = function del(key, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  options = this._waitForNode(options);
  this._call('del', key, options, callback);
};

N.batch = function batch(b, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  options = this._waitForNode(options);
  this._call('batch', b, options, callback);
};

N.createWriteStream = function createWriteStream(options) {
  var self = this;
  var ws = new BatchWriteStream(options);
  ws._writeBatch = function _writeBatch(batch, cb) {
    self.batch(batch, cb);
  };

  return ws;
};

N.createReadStream = function createReadStream(options) {
  return this.skiff.createReadStream(options);
};

N.iterator = function iterator(options) {
  return this.skiff.iterator(options);
};

N.join = function join(url, options, cb) {
  this.skiff.join(url, options || null, cb);
};

N.leave = function leave(url, cb) {
  this.skiff.leave(url, cb);
};

N.open = function open(cb) {
  this.skiff.open(cb);
};

N.close = function close(cb) {
  var self = this;

  this._transportServer.close(function() {
    self.gossip.stop(function() {
      self.skiff.close(cb);
    });
  });
};

N._call = function _call(methodName) {
  var self = this;

  var method = this.skiff[methodName];
  var args = Array.prototype.slice.call(arguments);
  args.shift();

  for (var i = args.length - 1 ; i >= 0 ; i --) {
    if (args[i] === undefined) {
      args.pop();
    } else {
      break;
    }
  }

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
      var remoteArgs = args.slice(0, args.length - 1);
      self._remoteCall.call(self, err.leader, methodName, remoteArgs, replied);
      self._gossipLeader(err.leader);
    }
  }
};

N._remoteCall = function _remoteCall(node, method, args, cb) {
  var remote = this._remote(node);
  if (!remote) {
    cb(new Error('could not find remote metadata for URL ' + node));
  }
  else if (remote.connected) {
    invoke(remote.client);
  } else {
    remote.once('connect', invoke);
  }

  function invoke(client) {
    var m = client[method];
    if (!m) {
      throw new Error('Method not found: ' + method);
    }
    args.push(cb);
    m.apply(client, args);
  }
};

N._remote = function _remote(node) {
  var remote = this._remotes[node];
  if (!remote) {
    var meta = this.skiff.peerMeta(node);
    if (meta) {
      remote = this._remotes[node] = Peer(meta.hostname, meta.port);
    }
  }
  return remote;
};

N._waitForNode = function _waitForNode(options) {
  if (!options) {
    options = {};
  }
  options.waitForNode = this.id;
  return options;
};

N._gossipLeader = function gossipLeader(leader) {
  var currentLeader = this.gossip.cluster.get('leader');
  if (currentLeader != leader) {
    this.gossip.cluster.set('leader', leader);
  }
};
