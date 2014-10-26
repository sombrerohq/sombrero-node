'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var it = lab.it;
var assert = Lab.assert;
var describe = lab.describe;

var Node = require('../');

describe('standalone', function() {

  var node;

  it('can get created', function(done) {
    node = Node('tcp+msgpack://localhost:8080');
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
});
