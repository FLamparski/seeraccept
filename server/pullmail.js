/* global Meteor, Alerts, _, Logger, MailProcessor, check */

var Imap = Meteor.npmRequire('imap'),
  MailParser = Meteor.npmRequire('mailparser').MailParser,
  Future = Meteor.npmRequire('fibers/future'),
  inspect = Meteor.npmRequire('util').inspect;

function bindAndWrapAsync(target, context) {
  var fut = new Future();
  var cb = Meteor.bindEnvironment(function(e, r) {
    if (e) {
      return fut.throw(e);
    }
    return fut.return(r);
  });
  return function() {
    var args = _.toArray(arguments);
    args.push(cb);
    target.apply(context, args);
    return fut.wait();
  };
}

function findAllMail(boxes) {
  var all = null;
  function inner(boxes) {
    var keys = _.keys(boxes);
    _.each(keys, function(key) {
      boxes[key]._name = key;
      if (boxes[key].children) {
        boxes[key].children = inner(boxes);
      }
      if (boxes[key].attribs.indexOf('\\All') > -1) {
        all = boxes[key];
      }
    });
  }
  inner(boxes);
  return all;
}

function checkAllPortalMail(user, imap, onMailFetched) {
  Logger.log('checkAllPortalMail', user._id);
  var boxes = bindAndWrapAsync(imap.getBoxes, imap)();
  var allMailBox = findAllMail(boxes);
  var allMailBoxName = [allMailBox.parent._name, allMailBox._name]
    .join(allMailBox.parent.delimiter);

  bindAndWrapAsync(imap.openBox, imap)(allMailBoxName); // Do I even need this?

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
  var qs = [sender, [queries].join(' OR ')].join(' ');
  var searchResults = bindAndWrapAsync(imap.search, imap)(['ALL', ['X-GM-RAW', qs]]);

  var fetchStream;
  try {
    fetchStream = imap.fetch(searchResults, {bodies: ''});
  } catch (e) {
    if (e.message === 'Nothing to fetch') {
      return;
    }
    throw e;
  }

  fetchStream.on('message', function(message) {
    var parser = new MailParser();
    parser.on('end', function(message) {
      mail.push(message);
    });
    message.on('body', function(stream) {
      stream.pipe(parser);
    });
  });
  fetchStream.once('error', function(err) {
    onMailFetched(err);
  });
  fetchStream.once('end', function() {
    Logger.log('checkAllPortalMail', user._id, mail.length);
    onMailFetched(null, mail);
  });
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

  imap.once('ready', checkAllPortalMail.bind(null, user, imap, doneCheckUserMail));
  imap.once('end', function() {
    Logger.log('checkUserMail', user._id, 'complete', mail.length);
  });
  imap.once('error', function(err) {
    Logger.error('checkUserMail', user._id, 'error', inspect(err, {depth: 0}));
    doneCheckUserMail(err);
  });
  imap.connect();
}

Meteor.methods({
  checkMail: function() {
    check(this.userId, String);

    var user = Meteor.users.findOne(this.userId);
    check(user, Object);
    this.unblock();

    Meteor.users.update(this.userId, {$set: {'profile.mailCheck': new Date()}});
    var mail = bindAndWrapAsync(checkUserMail)(user);
    var sorted = {
      submitted: [],
      live: [],
      rejected: [],
      duplicate: [],
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
        sorted.duplicate.push(message);
      } else if (message.subject.indexOf('Portal review complete') === 0) {
        sorted.reviewed.push(message);
      }
    });
    Meteor.users.update(this.userId, {$unset: {'profile.mailCheck': ''}});
    Meteor.setTimeout(function() {
      MailProcessor.process(user._id, sorted);
    }, 0);
    return _.chain(sorted).map(function(list, key) {
      return [key, list.length];
    }).object();
  }
});
