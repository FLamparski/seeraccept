/* global Meteor, _, Logger, MailProcessor, check */

var Imap = Meteor.npmRequire('imap'),
  MailParser = Meteor.npmRequire('mailparser').MailParser,
  inspect = Meteor.npmRequire('util').inspect;

function findAllMail(boxes) {
  var all = null;
  function inner(boxes) {
    var keys = _.keys(boxes);
    _.each(keys, function(key) {
      boxes[key]._name = key;
      if (!all && boxes[key].children) {
        boxes[key].children = inner(boxes[key].children);
      }
      if (boxes[key].attribs.indexOf('\\All') > -1) {
        all = boxes[key];
      }
    });
  }
  inner(boxes);
  Logger.log('findAllMail finished', all._name);
  return all;
}

function checkAllPortalMail(user, imap, onMailFetched) {
  Logger.log('checkAllPortalMail', user._id);
  var boxes = Meteor.wrapAsync(imap.getBoxes, imap)();
  var allMailBox = findAllMail(boxes);
  var allMailBoxName = [allMailBox.parent._name, allMailBox._name]
    .join(allMailBox.parent.delimiter);

  Meteor.wrapAsync(imap.openBox, imap)(allMailBoxName); // Do I even need this?
  Logger.log('checkAllPortalMail', user._id, 'box open');

  var mail = [];
  var sender = 'from:ingress-support@google.com';
  var queries = [
    '"Ingress Portal Submitted"',
    '"Ingress Portal Live"',
    '"Ingress Portal Rejected"',
    '"Ingress Portal Duplicate"',
    '"Portal submission confirmation"',
    '"Portal review complete"'
  ];
  var qs = [sender, queries.join(' OR ')].join(' ');
  Logger.log('checkAllPortalMail', user._id, 'query', qs);
  var searchResults = Meteor.wrapAsync(imap.search, imap)(['ALL', ['X-GM-RAW', qs]]);
  Logger.log('checkAllPortalMail', user._id, 'search results done');

  var fetchStream;
  try {
    fetchStream = imap.fetch(searchResults, {bodies: ''});
    Logger.log('checkAllPortalMail', user._id, 'fetchStream open');
  } catch (e) {
    if (e.message === 'Nothing to fetch') {
      Logger.log('checkAllPortalMail', user._id, e.message);
      return onMailFetched(null, []);
    }
    throw e;
  }

  fetchStream.on('message', Meteor.bindEnvironment(function(message, seqNo) {
    var parser = new MailParser();
    parser.on('end', Meteor.bindEnvironment(function(message) {
      Logger.log('on parser.end', user._id, message.messageId, message.subject);
      mail.push(message);
      searchResults.splice(searchResults.indexOf(seqNo), 1);
      if (searchResults.length === 0) {
        imap.end();
        Logger.log('checkAllPortalMail', user._id, mail.length);
        return onMailFetched(null, mail);
      }
    }));
    message.on('body', Meteor.bindEnvironment(function(stream) {
      stream.pipe(parser);
    }));
  }));
  fetchStream.once('error', Meteor.bindEnvironment(function(err) {
    onMailFetched(err);
  }));
  fetchStream.once('end', Meteor.bindEnvironment(function() {
    Logger.log('checkAllPortalMail', user._id, 'fetch stream closed');
  }));
}

function checkUserMail(user, doneCheckUserMail) {
  Logger.log('checkUserMail', user._id);
  var token = user.services.google.accessToken;
  var saslToken = new Buffer('user=' + user.services.google.email
    + '\x01Auth=Bearer ' + token + '\x01\x01').toString('base64');
  var imap = new Imap({
    user: user.services.google.email,
    xoauth2: saslToken,
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  });

  var mail = [];

  imap.once('ready', Meteor.bindEnvironment(checkAllPortalMail.bind(null, user, imap, doneCheckUserMail)));
  imap.once('end', Meteor.bindEnvironment(function() {
    Logger.log('checkUserMail', user._id, 'complete', mail.length);
  }));
  imap.once('error', Meteor.bindEnvironment(function(err) {
    Logger.error('checkUserMail', user._id, 'error', inspect(err, {depth: 0}));
    doneCheckUserMail(err);
  }));
  imap.connect();
}

Meteor.methods({
  checkMail: function() {
    check(this.userId, String);
    Logger.log('method /checkMail', this.userId);

    var user = Meteor.users.findOne(this.userId);
    check(user, Object);
    if (user.profile.mailCheck) {
      Logger.log('method /checkMail', this.userId, 'already in progress');
      return null;
    }
    this.unblock();

    Meteor.users.update(this.userId, {$set: {'profile.mailCheck': new Date()}});
    try {
      var mail = Meteor.wrapAsync(checkUserMail)(user);
    } catch (ex) {
      Logger.error('Error in a wrapped function:', ex.stack || ex.message || inspect(ex));
      // Drop the lock so that they don't get the spinny icon of death
      Meteor.users.update(this.userId, {$unset: {'profile.mailCheck': ''}});
      if (ex.message === 'Error: Invalid credentials (Failure)') {
        throw new Meteor.Error(401, 'Sorry, but your Google OAuth token has expired. Please log out and log back in.');
      } else {
        throw new Meteor.Error(500, 'Bad things happened on the server: ' + ex.message);
      }
    }
    var sorted = {
      submitted: [],
      live: [],
      rejected: [],
      duplicates: [],
      reviewed: []
    };
    _.each(mail, function(message) {
      if (message.subject.indexOf('Ingress Portal Submitted') === 0
        || message.subject.indexOf('Portal submission confirmation') === 0) {
        sorted.submitted.push(message);
      } else if (message.subject.indexOf('Ingress Portal Live') === 0) {
        sorted.live.push(message);
      } else if (message.subject.indexOf('Ingress Portal Rejected') === 0) {
        sorted.rejected.push(message);
      } else if (message.subject.indexOf('Ingress Portal Duplicate') === 0) {
        sorted.duplicates.push(message);
      } else if (message.subject.indexOf('Portal review complete') === 0) {
        sorted.reviewed.push(message);
      }
    });
    Meteor.users.update(this.userId, {$unset: {'profile.mailCheck': ''}});
    Meteor.setTimeout(function() {
      MailProcessor.process(user._id, sorted);
    }, 0);
    var summary = _.chain(sorted).map(function(list, key) {
      return [key, list.length];
    }).object().value();
    Logger.log('method /checkMail', user._id, inspect(summary));
    return summary;
  }
});
