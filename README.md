# Sombrero Node

Node of a Sombrero cluster. Uses [Skiff](https://github.com/pgte/skiff) underneath.

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

# Setting up a cluster

To boot a cluster, start a node and wait for it to become a leader. Then, create each additional node in the `standby` mode (`options.skiff.standby: true`) and do `leader.join(nodeURL)`.

See [this test](https://github.com/sombrerohq/sombrero-node/blob/master/tests/networked.js) for an actual implementation.

# License

ISC