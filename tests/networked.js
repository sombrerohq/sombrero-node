'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var it = lab.it;
var assert = Lab.assert;
var describe = lab.describe;

var path = require('path');
var async = require('async');
var concat = require('concat-stream');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var Node = require('../');

describe('networked', function() {

  var dbPath = path.join(__dirname, '..', 'db', 'networked');

  rimraf.sync(dbPath);
  mkdirp.sync(dbPath);

  var leader;
  var follower;
  var commands;

  it('can create leader', function(done) {
    leader = Node('tcp+msgpack://localhost:8090', {
      skiff: {dbPath: path.join(dbPath, 'leader')},
      port: 8070,
      gossip: {
        port: 7070
      }
    });
    leader.once('leader', function() {
      done();
    });
  });

  it('create follower', function(done) {
    follower = Node('tcp+msgpack://localhost:8091', {
      skiff: {
        dbPath: path.join(dbPath, 'follower'),
        standby: true
      },
      port: 8071,
      gossip: {
        port: 7071
      }
    });
    done();
  });

  it('can join follower', function(done) {
    leader.join(follower.id, {
      hostname: 'localhost',
      port: 8071,
      gossipPort: 7071
    }, done);
  });

  it('waits a bit', function(done) {
    setTimeout(done, 1e3);
  });

  it('can put', function(done) {
    follower.put('key', 'value', done);
  });

  it('can get', function(done) {
    follower.get('key', function(err, value) {
      if (err) {
        done(err);
      }
      assert.equal(value, 'value');
      done();
    });
  });

  it('handles errors on callback', function(done) {
    follower.get('doesnotexist', function(err) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Key not found in database');
      done();
    });
  });

  it('handles errors by emitting error when no callback', function(done) {
    follower.get('doesnotexist');
    follower.once('error', function(err) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Key not found in database');
      done();
    });
  });

  it('can delete', function(done) {
    follower.del('key', done);
  });

  it('delete worked', function(done) {
    follower.get('key', function(err) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Key not found in database');
      done();
    });
  });

  it('can create a write stream', function(done) {
    commands = [];
    for (var i = 0 ; i < 10 ; i ++) {
      commands.push({
        type: 'put',
        key: 'key ' + i,
        value: 'value ' + i
      });
    }
    var ws = follower.createWriteStream();
    async.each(commands, ws.write.bind(ws), done);
  });

  it('can create a read stream', function(done) {
    commands.forEach(function(command) {
      delete command.type;
    });

    follower.createReadStream().pipe(concat(function(data) {
      assert.deepEqual(data, commands);
    })).once('finish', done);
  });

  it('can batch', function(done) {
    follower.batch([
      {
        type: 'put',
        key: 'a',
        value: 'A'
      },
      {
        type: 'put',
        key: 'b',
        value: 'B'
      }
    ], done);
  });

  it('batch worked', function(done) {
    async.map(['a', 'b'], follower.get.bind(follower), function(err, values) {
      if (err) {
        throw err;
      }
      assert.deepEqual(values, ['A', 'B']);
      done();
    });
  });

  it('closes all nodes', function(done) {
    async.each([leader, follower], function(node, cb) {
      node.close(cb);
    }, done);
  });

});
