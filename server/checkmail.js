/* global Meteor, Alerts, _, Async, Logger, MailProcessor, check */

var Imap = Meteor.npmRequire('imap'),
  xoauth2 = Meteor.npmRequire('xoauth2'),
  MailParser = Meteor.npmRequire('mailparser').MailParser,
  inspect = Meteor.npmRequire('util').inspect,
  fs = Meteor.npmRequire('fs'),
  imapState = {
    's': 'not-yet',
    'l': 'not-yet',
    'r': 'not-yet',
    'd': 'not-yet'
  };

// Since we are checking several searches pretty much simultaneously, we need to
// keep track of when the three operations finish, and only then close the IMAP connection.
// it's not the most complex flag ever, but it's getting there.
function yield_imap(symbol) {
  imapState[symbol] = 'yield';
  return (imapState.s === 'yield' && imapState.l === 'yield' && imapState.r === 'yield' && imapState.d === 'yield');
}

function alert_user(uid, atype, atext) {
  Alerts.remove({
    'uid': uid
  });
  Alerts.insert({
    'uid': uid,
    'atype': atype,
    'atext': atext
  });
}

function handle_search_results(type, results, imap, user, callback) {
  Logger.log('handle_search_results', user._id, type, results.length);
  var f;
  try {
    f = imap.fetch(results, {
      bodies: ''
    });
  } catch (e) {
    if (e.message === 'Nothing to fetch') {
      callback(null, []);
      return;
    } else {
      callback(e, null);
      return;
    }
  }
  var result = [];
  f.on('message', function(message, seqno) {
    var parser = new MailParser();
    parser.on('end', function(mail) {
      result.push(mail);
    });
    message.on('body', function(stream, info) {
      stream.on('data', function(chunk) {
        parser.write(chunk);
      });
      stream.on('end', function() {
        parser.end();
      });
    });
  });
  f.once('error', function(err) {
    if (yield_imap(type[0])) {
      imap.end();
    }
    callback(err, null);
  });
  f.once('end', function() {
    Logger.log('handle_search_results', user._id, type, results.length, 'fetched');
    if (yield_imap(type[0])) {
      imap.end();
    }
    callback(null, result);
  });
}

function handle_check_mail(user, token, callback) {
  Logger.log('handle_check_mail', user._id);
  var mail = {};
  // Format the access token as specified in the SASL XOAUTH2 document:
  // https://developers.google.com/gmail/xoauth2_protocol
  // Previously this was done using the xoauth2 module but that had the
  // side effect of resetting some tokens which led to credential
  // failures later on.
  var _token = new Buffer('user=' + user.services.google.email + '\x01Auth=Bearer ' + token + '\x01\x01').toString('base64');
  var myImap = new Imap({
    user: user.services.google.email,
    xoauth2: _token,
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  });
  function onAllMailBoxFound(boxname, callback) {
    myImap.openBox(boxname, true, function(err, box) {
      if (err) {
        callback(err, null);
      }

      Logger.log('handle_check_mail', user._id, 'opened mailbox', boxname);
      myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Submitted"']],
        function(err, results) {
          Logger.log('handle_check_mail', user._id, 'submitted');
          if (err) {
            return callback(err, null);
          }
          handle_search_results('submitted', results, myImap, user, function(err, result) {
            if (err) {
              callback(err, null);
              return;
            }
            mail.submitted = result;
          });
        }); // psubs handler
      myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Live"']],
        function(err, results) {
          if (err) {
            return callback(err, null);
          }
          handle_search_results('live', results, myImap, user, function(err, result) {
            Logger.log('handle_check_mail', user._id, 'live');
            if (err) {
              callback(err, null);
              return;
            }
            mail.live = result;
          });
        }); // plive handler
      myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Rejected"']],
        function(err, results) {
          Logger.log('handle_check_mail', user._id, 'rejected');
          if (err) {
            return callback(err, null);
          }
          handle_search_results('rejected', results, myImap, user, function(err, result) {
            if (err) {
              callback(err, null);
              return;
            }
            mail.rejected = result;
          });
        }); // prejected handler
      myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Duplicate"']],
        function(err, results) {
          Logger.log('handle_check_mail', user._id, 'duplicate');
          if (err) {
            return callback(err, null);
          }
          handle_search_results('duplicate', results, myImap, user, function(err, result) {
            if (err) {
              callback(err, null);
              return;
            }
            mail.duplicates = result;
          });
        }); // pdupe handler
    }); // open box handler
  }

  myImap.once('ready', function() {
    myImap.getBoxes(function(err, boxes) {
      Logger.log('getBoxes', user._id, 'looking for "ALL"');
      if (err) {
        Logger.error('getBoxes', user._id, err);
      }
      var allmail = null;

      function traverseBoxes(boxes) {
        var keys = _.keys(boxes);
        var copied = _.each(keys, function(key) {
          boxes[key]._name = key;
          if (boxes[key].children) {
            boxes[key].children = traverseBoxes(boxes[key].children);
          }
          if (boxes[key].attribs.indexOf('\\All') >= 0) {
            allmail = boxes[key];
          }
        });
        return boxes;
      }
      traverseBoxes(boxes);

      if (allmail === null) {
        callback(new Error('Fatal: Could not locate an ALL box!'), null);
        return;
      }

      var allboxname = allmail.parent._name + allmail.parent.delimiter + allmail._name;
      Logger.log('getBoxes', user._id, '"ALL" is', allboxname);
      onAllMailBoxFound(allboxname, callback);
    });
  }); // once ready handler

  myImap.once('error', function(error) {
    console.error(inspect(error));
    callback(error, null);
  }); // once error handler

  myImap.once('end', function() {
    Logger.log('handle_check_mail', user._id, 'finished', _.keys(mail));
    callback(null, mail);
  });

  try {
    myImap.connect();
  } catch (err) {
    Logger.error('handle_check_mail', user._id, inspect(err));
    callback(err);
  }
}

/* global doCheckMail:true */
doCheckMail = function(userId) {
  Logger.log('check_mail', userId);
  var user = Meteor.users.findOne(userId);
  if (user.profile.isCheckingMail) {
    Logger.log('check_mail', userId, 'already in progress');
    return;
  }
  alert_user(userId, 'notice', 'Ipsum is checking your mail.');
  Meteor.users.update(userId, {
    $set: {
      'profile.isCheckingMail': true
    }
  });

  var checkMail = Async.wrap(handle_check_mail);
  try {
    var mail = checkMail(user, user.services.google.accessToken);
    var total = mail.submitted.length + mail.live.length + mail.rejected.length;
    alert_user(userId, 'notice', 'Fetched ' + total + ' messages. ' +
      mail.submitted.length + ' submissions, ' +
      mail.live.length + ' live, ' +
      mail.rejected.length + ' rejected.');
    Meteor.setTimeout(function() {
      MailProcessor.process(userId, mail);
    }, 0);
  } catch (e) {
    console.error(e.stack);
    alert_user(userId, 'error', 'Error fetching messages: ' + e.toString());
  }
  Meteor.users.update(userId, {
    $unset: {
      'profile.isCheckingMail': ''
    }
  });
};

Meteor.methods({
  check_mail: function() {
      check(this.userId, String);
      this.unblock();
      doCheckMail(this.userId);
    } // check_mail
});
