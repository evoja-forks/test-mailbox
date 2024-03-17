/*!
 * test-mailbox
 * Copyright(c) 2012 RGBboy <me@rgbboy.com>
 * MIT Licensed
 */

/**
* Module dependencies.
*/

var EventEmitter = require('events').EventEmitter,
    SMTPServer = require('smtp-server').SMTPServer,
    MailParser = require('mailparser').MailParser;

/**
 * Expose `TestMailbox`.
 */

exports = module.exports = TestMailbox;

function TestMailbox(options) {

  // Default connection timeout to 50ms. This allows us to close 
  // the server in an appropriate timeframe for testing.
  // The alternative is to setup the server in its own process
  //  and tear it down on close.
  options.timeout = options.timeout || 200;

  var self = new EventEmitter(),
      smtp = new SMTPServer({
        socketTimeout: options.timeout,
        closeTimeout: options.timeout,
        name: 'localhost',
        secure: true,
        authOptional: false,
        disableReverseLookup: true,
        onAuth: authorizeUser,
        onMailFrom: undefined,
        onRcptTo: validateRecipient,
        onData: onData,
      });

  function authorizeUser(auth, session, callback) {
    if (auth.username === options.auth.user && auth.password === options.auth.pass) {
      callback(null, {user: auth.username});
    } else {
      callback(new Error('Invalid username or password'));
    };
  }

  function validateRecipient(address, session, callback) {
    if (options.address.length && options.address.indexOf(address.address) != -1) {
      callback();
    } else if (address.address === options.address) {
      callback();
    } else {
      callback(new Error('Recipient not found'));
    };
  }

  function onData(stream, session, callback) {
    var saveStream = new MailParser();
    saveStream.on('end', function (mail) {
      self.emit('newMail', mail);
    });
    stream.pipe(saveStream);
    stream.on('end', function () {
      callback(null, 'queueId'); // queueId is the queue id to be advertised to the client
    });
  }

  // Start Listening
  self.listen = function (port, listener) {
    smtp.listen(port, listener);
  };

  self.close = function (callback) {
    smtp.close(callback);
  };

  return self;

}