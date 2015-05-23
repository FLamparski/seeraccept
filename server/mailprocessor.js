/* global Meteor, MailProcessorV2 _, Portals, Mongo, Logger, escape */

var cheerio = Meteor.npmRequire('cheerio');
/* global MailProcessor:true */
MailProcessor = {};

var INSECURE_HTTP = /^http:/;

var MessageIDs = new Mongo.Collection('messageIDs');

MailProcessor.upsertPortal = function (obj, submitted, userId) {
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
};

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

  /*
   * Mail comes in 4 types: submitted, rejected, dupe, and live.
   * First, we process the submitted portals to get the general
   * idea of what portals there are. Then we process the
   * live portals and the rejects for complete portal history.
   * Portals are matched by title.
   */
  mail.submitted.map(function(msg) {
    var $msg = cheerio.load(msg.html);
    var imageUrl = $msg('img').attr('src');
    if (INSECURE_HTTP.test(imageUrl)) {
      imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
    }
    return msg.html.match(/<i>-NianticOps<\/i>/) ? MailProcessorV2.submitted(msg, imageUrl, userId) : {
      'submitter': userId,
      'name': msg.subject.slice(26), // skips "Ingress Portal Submitted: "
      'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(26)),
      'date': msg.date,
      'messageId': msg.messageId
    };
  }).forEach(function(obj) {
    MailProcessor.upsertPortal(obj, true, userId);
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
    MailProcessor.upsertPortal(obj, false, userId);
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
    MailProcessor.upsertPortal(obj, false, userId);
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
    MailProcessor.upsertPortal(obj, false, userId);
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

  // Version 2 Niantic mail reviews:
  mail.reviewed.map(function (msg) {
    if (msg.body.match(/Portal is now available on your Scanner/g)) {
      MailProcessorV2.live(msg, userId);
    } else if (msg.body.match(/we have decided not to accept this candidate/g)) {
      MailProcessorV2.rejected(msg, userId);
    } else if (msg.body.match(/Your candidate is a duplicate of either an existing Portal/g)) {
      MailProcessorV2.duplicate(msg, userId);
    } else {
      MailProcessorV2.unknownReview(msg, userId);
    }
  });
};
