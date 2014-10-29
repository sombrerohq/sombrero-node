'use strict';

var net = require('net');
var rpc = require('rpc-stream');
var once = require('once');
var Server = require('./server');
var MsgPack = require('msgpack-stream');
var reconnect = require('reconnect-net');
var EventEmitter = require('events').EventEmitter;

exports.connect = connect;

function connect(hostname, port) {
  var r = reconnect().connect(port, hostname);
  var ee = new EventEmitter();
  ee.connected = false;

  ee.disconnect = disconnect;

  r.on('connect', onConnect);
  r.on('reconnect', onReconnect);
  r.on('disconnect', onDisconnect);

  return ee;

  function onConnect(con) {
    var remote = rpc();
    remote.pipe(MsgPack.createEncodeStream()).pipe(con);
    con.pipe(MsgPack.createDecodeStream()).pipe(remote);

    var client = remote.wrap(Server.methods);

    ee.connected = true;
    ee.client = client;
    ee.emit('connect', client);
  }

  function onReconnect() {
    ee.emit('reconnect');
  }

  function onDisconnect() {
    ee.connected = false;
    ee.emit('disconnect');
  }

  function disconnect() {
    r.disconnect();
  }
}

exports.listen = listen;

function listen(port, hostname, server, callback) {
  var netServer = net.createServer(onConnection);
  netServer.listen(port, hostname, onceListening);
  callback = once(callback);
  netServer.once('error', callback);

  return netServer;

  function onceListening() {
    netServer.removeListener('error', callback);
    callback();
  }

  function onConnection(con) {
    var service = rpc(server);
    con.pipe(MsgPack.createDecodeStream()).pipe(service).
    pipe(MsgPack.createEncodeStream()).pipe(con);
  }

}
