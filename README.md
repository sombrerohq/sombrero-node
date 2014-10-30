# Sombrero Node

[![Build Status](https://travis-ci.org/sombrerohq/sombrero-node.svg)](https://travis-ci.org/sombrerohq/sombrero-node)
[![Dependency Status](https://david-dm.org/sombrerohq/sombrero-node.svg)](https://david-dm.org/sombrerohq/sombrero-node)

Node of a Sombrero cluster. Uses [Skiff](https://github.com/pgte/skiff) (A [Raft](http://raftconsensus.github.io/) implementation) underneath.

* As a leader, creates an independent RPC server for servicing requests from followers.
* As a follower, forwards the write requests to the leader.
* As a follower, makes sure that the leader writes to the issuing follower before returning.
* Because of this last point, it implements a read-your-writes on a follower.

## Install

```bash
$ npm install sombrero-node --save
```

## Require

```javascript
var Node = require('sombrero-node');
```

## Create

```javascript
var url = 'tcp+msgpack://localhost:8000';
var port = 7000;
var options = {
  skiff: {
    dbPath: '/path/to/my/leveldb/dir'
  },
  port: port
};

var node = Node(url, options);
```

### Options

* `skiff`: all the [options supported by skiff](https://github.com/pgte/skiff#options)
* `port`: the TCP port for exposing the RPC server. Defaults to `5201`.
* `transport`: a transport module provider. Defaults to [this](https://github.com/sombrerohq/sombrero-node/blob/master/lib/transport.js).
* `gossip`: an object with the following attributes:
  * `port`: gossip port. defaults to 8217

# Use

A Sombrero node implements [the level-up API](https://github.com/rvagg/node-levelup#api).

You can also extend the client with level-* plugins, including [sublevel](https://github.com/dominictarr/level-sublevel).

## .join(url, options, cb)

Joins a node given its URL. Options should contain the hostname and port of the node Sombrero RPC server.

Example:

```javascript
var options = {
  hostname: 'localhost',
  port: 8071
};

node.join('tcp+msgpack://hostname:8000', options, function(err) {
  if (err) throw err;
  console.log('joined');
});
```

## .leave(url, cb)

Leaves a node given its URL.

## .close(cb)

Closes the server and the skiff node.

## Events

A Sombrero node emits the same [events as a Skiff node](https://github.com/pgte/skiff#events).


# Setting up a cluster

To boot a cluster, start a node and wait for it to become a leader. Then, create each additional node in the `standby` mode (`options.skiff.standby: true`) and do `leader.join(nodeURL)`.

See [this test](https://github.com/sombrerohq/sombrero-node/blob/master/tests/networked.js) for an actual implementation.

# License

ISC