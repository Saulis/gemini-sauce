var _ = require('lodash');
var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');


describe('plugin', function() {
  var plugin,
      gemini,
      q,
      deferred,
      sauce;

  before(function() {
    q = sinon.spy();
    sauce = sinon.spy();

    mockery.registerMock('q', q);
    mockery.registerMock('./sauce', function() { return sauce; });
  });

  beforeEach(function() {
    q.reset();
    sauce.reset();

    gemini = sinon.spy();
    gemini.on = function(event, cb) {
      gemini[event] = cb;
    };
    gemini.config = {
      getBrowserIds: function () {
         return _.keys(gemini.config._browsers)
      },
      forBrowser: function (browserId) {
         return gemini.config._browsers[browserId]
      },
      _browsers: {}
    };

    deferred = sinon.spy();
    deferred.resolve = sinon.spy();

    q.defer = sinon.spy(function() {
      return deferred;
    });

    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    plugin = require('../lib/plugin');

    mockery.disable();
  });

  afterEach(function() {
    delete process.env.SAUCE_USERNAME;
    delete process.env.SAUCE_ACCESS_KEY;
  });

  it('should fail if credentials not provided', function() {
    expect(function() {
      plugin(gemini, {});
    }).to.throw(Error);
  });

  it ('should read credentials from env', function() {
    process.env.SAUCE_USERNAME = 'foo';
    process.env.SAUCE_ACCESS_KEY = 'bar';

    var opts = {};
    plugin(gemini, opts);

    expect(opts.username).to.equal('foo');
    expect(opts.accessKey).to.equal('bar');
  });

  function init() {
    plugin(gemini, {username: 'foo', accessKey: 'bar'});
  };

  describe('on startRunner', function() {
    function startRunner() {
      return gemini['startRunner']();
    };

    beforeEach(function() {
      init();
      sauce.start = sinon.spy();
    });

    it('should start sauce tunnel', function() {
      startRunner();

      expect(sauce.start.called).to.be.true;
    });

    it('should inject gridUrl to browsers', function() {
      gemini.config._browsers = {'chrome': {desiredCapabilities: {platform: 'Windows'}}};
      sauce.start = function(opts, cb) {
        cb({gridUrl: 'url'});
      };

      startRunner();

      expect(gemini.config._browsers.chrome.gridUrl).to.equal('url');
    });

    it('should inject tunnel identifier to browsers', function() {
      gemini.config._browsers = {'chrome': {desiredCapabilities: {platform: 'Windows'}}};
      sauce.start = function(opts, cb) {
        cb({tunnelId: 'identifier'});
      };

      startRunner();

      expect(gemini.config._browsers.chrome.desiredCapabilities['tunnel-identifier']).to.equal('identifier');
    });

    it('should return a promise', function() {
      deferred.promise = sinon.spy();

      expect(startRunner()).to.equal(deferred.promise);
    });

    it('should resolve the given promise', function() {
      sauce.start = function(opts, cb) {
        cb({});
      };

      startRunner();

      expect(deferred.resolve.called).to.be.true;
    });
  });

  describe('on endRunner', function() {
    function endRunner() {
      return gemini['endRunner']();
    };

    beforeEach(function() {
      plugin(gemini, {username: 'foo', accessKey: 'bar'});
      sauce.stop = sinon.spy();
    });

    it('should stop sauce tunnel', function() {
      endRunner();

      expect(sauce.stop.called).to.be.true;
    });

    it('should return a promise', function() {
      deferred.promise = sinon.stub();

      expect(endRunner()).to.equal(deferred.promise);
    });

    it('should resolve the given promise', function() {
      sauce.stop = function(cb) {
        cb();
      }

      endRunner();

      expect(deferred.resolve.called).to.be.true;
    });
  });
});
