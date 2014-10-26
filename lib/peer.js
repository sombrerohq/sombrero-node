'use strict';

var multilevel = require('multilevel/msgpack');

function Peer(node) {
  if (!(this instanceof Peer)) {
    return new Peer(node);
  }

  this._remote = null;
}

var P = Peer.prototype;

P.call = function call(type) {
  var remote = this.getRemote();
  var args = Array.prototype.slice.call(arguments);
  remote[type].apply(args);
};

P.getRemote = function getRemote(node) {
  if (!this._remote) {
    this._remote = multilevel.client();
    var con = this._connect(node);
    con.pipe(this._remote).pipe(con);
  }
  return this._remote;
};
