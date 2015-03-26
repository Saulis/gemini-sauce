var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');

describe('sauce', function() {
  var sauce,
      sauceConnect,
      cleankill,
      tunnel;

  before(function() {
    cleankill = sinon.spy();
    sauceConnect = sinon.spy(function(opts, cb) {
      cb(null, tunnel);
    });

    mockery.registerMock('cleankill', cleankill);
    mockery.registerMock('sauce-connect-launcher', sauceConnect);
  });

  beforeEach(function() {
    sauceConnect.reset();
    cleankill.reset();

    tunnel = sinon.spy();
    sauceConnect.kill = sinon.spy();

    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    sauce = require('../lib/sauce')();

    mockery.disable();
  });

  describe('start', function() {
    var opts,
        done;

    function start() {
      sauce.start(opts, done);
    };

    beforeEach(function() {
      opts = {};
      done = sinon.spy();
      cleankill.onInterrupt = sinon.spy();
    });

    it('should throw error if tunnel already opened', function() {
      start();

      expect(function() { start(); }).to.throw(Error);
    });

    it('should generate a tunnel identifier by default', function() {
      start();

      expect(sauceConnect.args[0][0].tunnelIdentifier).to.not.be.undefined;
    });

    it('should callback with gridUrl and tunnelId', function() {
      opts.username = 'foo';
      opts.accessKey = 'bar';

      start();

      expect(done.args[0][0].gridUrl).to.equal('http://foo:bar@ondemand.saucelabs.com:80/wd/hub');
      expect(done.args[0][0].tunnelId).to.not.be.undefined;
    });

    it('should enable cleankill on interrupt', function() {
      start();

      expect(cleankill.onInterrupt.called).to.be.true;
    });
  });

  describe('stop', function() {
    var done;

    function stop() {
      sauce.stop(done);
    };

    beforeEach(function() {
      done = sinon.spy();
      tunnel.close = sinon.spy(function(cb) { cb(); });
    });

    it('should close the tunnel', function() {
      cleankill.onInterrupt = sinon.spy();
      sauce.start({}, sinon.spy());

      stop();

      expect(tunnel.close.called).to.be.true;
      expect(done.called).to.be.true;
    });

    it('should kill sauce connect if no tunnels are open', function() {
      sauceConnect.kill.bind = sinon.spy();

      stop();

      expect(sauceConnect.kill.bind.called).to.be.true;
      expect(done.called).to.be.true;
    });
  });
});