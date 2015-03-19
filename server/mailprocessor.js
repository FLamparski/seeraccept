/* global Meteor, _, Portals, Mongo, Logger, escape */

var cheerio = Meteor.npmRequire('cheerio');
/* global MailProcessor:true */
MailProcessor = {};

var INSECURE_HTTP = /^http:/;

var MessageIDs = new Mongo.Collection('messageIDs');

MailProcessor.process = function(userId, mail) {
  Logger.log('MailProcessor.process', userId);
  MessageIDs.insert({
    user: userId,
    date: new Date(),
    messageIDs: _.keys(mail).map(function(key) {
      var o = {};
      o[key] = _.pluck(mail[key], 'messageId');
      return o;
    })
  });

  function upsertPortal(obj, submitted) {
    if (!Portals.findOne({image: obj.image, submitter: obj.submitter})) {
      var model = _.pick(obj, 'submitter', 'name', 'image', 'messageId');
      Logger.log('MailProcessor.process', userId, 'new submission', model.name);
      model.history = submitted ? [{
        timestamp: obj.date,
        what: 'submitted',
        messageId: obj.messageId
      }] : [];
      var id = Portals.insert(model);
      Logger.log('MailProcessor.process', userId, 'new submission', model.name, id);
    }
  }

  /*
   * Mail comes in 4 types: submitted, rejected, dupe, and live.
   * First, we process the submitted portals to get the general
   * idea of what portals there are. Then we process the
   * live portals and the rejects for complete portal history.
   * Portals are matched by title.
   */
  mail.submitted.map(function(msg) {
    var imageUrl = cheerio.load(msg.html)('img').attr('src');
    if (INSECURE_HTTP.test(imageUrl)) {
      imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
    }
    return {
      'submitter': userId,
      'name': msg.subject.slice(26), // skips "Ingress Portal Submitted: "
      'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(26)),
      'date': msg.date,
      'messageId': msg.messageId
    };
  }).forEach(function(obj) {
    upsertPortal(obj, true);
    Logger.log('MailProcessor.process', userId, 'submitted', obj.name, obj.messageId);
  });

  mail.live.map(function(msg) {
    var $ = cheerio.load(msg.html);
    var imageUrl = $('img').attr('src');
    var intelUrl = $('a[href*="ingress.com/intel"]').attr('href');
    if (INSECURE_HTTP.test(imageUrl)) {
      imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
    }
    if (INSECURE_HTTP.test(intelUrl)) {
      intelUrl = intelUrl.replace(INSECURE_HTTP, 'https:');
    }
    return {
      'submitter': userId,
      'name': msg.subject.slice(21), // skips "Ingress Portal Live: "
      'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(21)),
      'intel': intelUrl,
      'date': msg.date,
      'messageId': msg.messageId
    };
  }).forEach(function(obj) {
    upsertPortal(obj);
    Logger.log('MailProcessor.process', userId, 'live', obj.name, obj.messageId);

    var updoc = {
      $addToSet: {
        'history': {
          'timestamp': obj.date,
          'what': 'live',
          messageId: obj.messageId
        }
      }
    };
    if (!(_.isUndefined(obj.intel))) {
      updoc = _.extend(updoc, {
        $set: {
          intel: obj.intel
        }
      });
    }
    Portals.update({image: obj.image, submitter: obj.submitter}, updoc);
  });

  mail.rejected.map(function(msg) {
    var imageUrl = cheerio.load(msg.html)('img').attr('src');
    if (INSECURE_HTTP.test(imageUrl)) {
      imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
    }
    return {
      'submitter': userId,
      'name': msg.subject.slice(25), // skips "Ingress Portal Rejected: "
      'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(25)),
      'date': msg.date,
      'messageId': msg.messageId
    };
  }).forEach(function(obj) {
    upsertPortal(obj);
    Logger.log('MailProcessor.process', userId, 'submitted', obj.name, obj.messageId);

    Portals.update({
        'image': obj.image,
        'submitter': obj.submitter
    }, {
      $addToSet: {
        'history': {
          'timestamp': obj.date,
          'what': 'rejected',
          messageId: obj.messageId
        }
      }
    });
  });

  mail.duplicates.map(function(msg) {
    var imageUrl = cheerio.load(msg.html)('img').attr('src');
    if (INSECURE_HTTP.test(imageUrl)) {
      imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
    }
    return {
      'submitter': userId,
      'name': msg.subject.slice(26), // skips "Ingress Portal Duplicate: "
      'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(25)),
      'date': msg.date,
      'messageId': msg.messageId
    };
  }).forEach(function(obj) {
    upsertPortal(obj);
    Logger.log('MailProcessor.process', userId, 'submitted', obj.name, obj.messageId);

    Portals.update({
        'image': obj.image,
        'submitter': obj.submitter
    }, {
      $addToSet: {
        'history': {
          'timestamp': obj.date,
          'what': 'duplicate',
          messageId: obj.messageId
        }
      }
    });
  });
};
