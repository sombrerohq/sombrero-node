'use strict';

var transport = require('./transport');

module.exports = Peer;

function Peer(hostname, port) {
  return transport.connect(hostname, port);
}
