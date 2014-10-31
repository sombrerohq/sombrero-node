'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var it = lab.it;
var assert = Lab.assert;
var describe = lab.describe;

var path = require('path');
var async = require('async');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var Node = require('../');

describe('gossip', function() {

  var dbPath = path.join(__dirname, '..', 'db', 'gossip');

  rimraf.sync(dbPath);
  mkdirp.sync(dbPath);

  var leader;
  var newLeader;
  var lastFollower;
  var nodes = [];

  it('can create leader', function(done) {
    leader = Node('tcp+msgpack://localhost:8090', {
      skiff: {dbPath: path.join(dbPath, 'leader')},
      port: 8030,
      gossip: {
        port: 7020
      }
    });
    nodes.push(leader);
    leader.once('leader', function() {
      done();
    });
  });

  it('create 4 followers', function(done) {
    var node;
    for (var i = 0 ; i < 4 ; i ++) {
      node = Node('tcp+msgpack://localhost:' + (8091 + i), {
        skiff: {
          dbPath: path.join(dbPath, 'node' + i),
          standby: true
        },
        port: 8031 + i,
        gossip: {
          port: 7031 + i
        }
      });
      nodes.push(node);
    }

    done();
  });

  it('can join followers', function(done) {
    async.each(nodes, function(node, cb) {
      if (node.id != leader.id) {
        leader.join(node.id, node.skiff.metadata, cb);
      }
      else {
        cb();
      }
    }, done);
  });

  it('waits a bit', function(done) {
    setTimeout(done, 1e3);
  });

  it('follower puts', function(done) {
    nodes[1].put('key', 'value', done);
  });

  it('waits a bit', {timeout: 4e3}, function(done) {
    setTimeout(done, 3e3);
  });

  it('every node knows the leader', function(done) {
    nodes.forEach(function(node) {
      assert.equal(node.gossip.cluster.get('leader'), leader.id);
    });
    done();
  });

  it('leader dies', {timeout: 6e3}, function(done) {
    nodes.forEach(function(node) {
      node.once('leader', haveLeader);
    });

    function haveLeader(node) {
      if (!newLeader) {
        newLeader = node;
        // debug(newLeader);
        done();
      }
    }

    leader.close(function(err) {
      if (err) {
        throw err;
      }
    });
  });

  it('has a follower', function(done) {
    var node;
    for (var i = 1 ; i < nodes.length ; i ++) {
      node = nodes[i];
      if (node.id != newLeader.id && node.id != leader.id) {
        lastFollower = node;
        break;
      }
    }
    assert(!!lastFollower, 'has last follower');
    assert.notEqual(lastFollower.id, newLeader.id);
    done();
  });

  it('waits a bit', {timeout: 15e3}, function(done) {
    setTimeout(done, 14e3);
  });

  it('every node but the old leader knows the leader', function(done) {
    nodes.forEach(function(node) {
      if (node != leader) {
        assert.equal(node.gossip.cluster.get('leader'), newLeader.id,
          node.id + ' thinks the leader is ' +
          node.gossip.cluster.get('leader'));
      }
    });
    done();
  });

  it('closes all nodes', {timeout: 10e3}, function(done) {
    async.each(nodes, function(node, cb) {
      if (node != leader) {
        node.close(cb);
      }
      else {
        cb();
      }
    }, done);
  });

});
