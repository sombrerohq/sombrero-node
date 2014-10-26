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

describe('standalone', function() {

  var dbPath = path.join(__dirname, '..', 'db', 'standalone');

  rimraf.sync(dbPath);
  mkdirp.sync(dbPath);

  var node;
  var commands;

  it('can get created', function(done) {
    node = Node('tcp+msgpack://localhost:8080', {
      dbPath: dbPath
    });
    done();
  });

  it('can put', function(done) {
    node.put('key', 'value', done);
  });

  it('can get', function(done) {
    node.get('key', function(err, value) {
      if (err) {
        throw err;
      }
      assert.equal(value, 'value');
      done();
    });
  });

  it('handles errors on callback', function(done) {
    node.get('doesnotexist', function(err) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Key not found in database');
      done();
    });
  });

  it('handles errors by emitting error when no callback', function(done) {
    node.get('doesnotexist');
    node.once('error', function(err) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Key not found in database');
      done();
    });
  });

  it('can delete', function(done) {
    node.del('key', done);
  });

  it('delete worked', function(done) {
    node.get('key', function(err) {
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
    var ws = node.createWriteStream();
    async.each(commands, ws.write.bind(ws), done);
  });

  it('can create a read stream', function(done) {
    commands.forEach(function(command) {
      delete command.type;
    });

    node.createReadStream().pipe(concat(function(data) {
      assert.deepEqual(data, commands);
    })).once('finish', done);
  });
});
