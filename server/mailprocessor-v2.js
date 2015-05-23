/* global Meteor, MailProcessor _, Portals, Mongo, Logger, escape */

var cheerio = Meteor.npmRequire('cheerio');
/* global MailProcessorV2:true */
MailProcessorV2 = {};

var INSECURE_HTTP = /^http:/;

function transformReviewedEmail(msg, userId) {
  var name = msg.subject.slice(24); // len(Portal review complete: )
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
    'name': name,
    'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(21)),
    'intel': intelUrl,
    'date': msg.date,
    'messageId': msg.messageId
  };
}

function addEventToPortalHistory(obj, type) {
  var updoc = {
    $addToSet: {
      history: {
        timestamp: obj.date,
        what: type,
        messageId: obj.messageId
      }
    }
  };
  if (!_.isUndefined(obj.intel)) {
    updoc = _.extend(updoc, {
      $set: {
        intel: obj.intel
      }
    });
  }
  Portals.update({image: obj.image, submitter: obj.submitter}, updoc);
}

MailProcessorV2 = {
  submitted: function(msg, imageUrl, userId) {
    var name = msg.subject.slice(32); // len(Portal submission confirmation: )
    return {
      'submitter': userId,
      'name': name,
      'image': imageUrl || Meteor.absoluteUrl() + 'image-missing/' + escape(msg.subject.slice(32)),
      'date': msg.date,
      'messageId': msg.messageId
    };
  },
  live: function(msg, userId) {
    var obj = transformReviewedEmail(msg, userId);
    MailProcessor.upsertPortal(obj, false, userId);
    Logger.log('MailProcessorV2.process', userId, 'live', obj.name, obj.messageId);

    addEventToPortalHistory(obj, 'live');
  },
  duplicate: function(msg, userId) {
    var obj = transformReviewedEmail(msg, userId);
    MailProcessor.upsertPortal(obj, false, userId);
    Logger.log('MailProcessorV2.process', userId, 'duplicate', obj.name, obj.messageId);

    addEventToPortalHistory(obj, 'duplicate');
  },
  rejected: function(msg, userId) {
    var obj = transformReviewedEmail(msg, userId);
    MailProcessor.upsertPortal(obj, false, userId);
    Logger.log('MailProcessorV2.process', userId, 'rejected', obj.name, obj.messageId);

    addEventToPortalHistory(obj, 'rejected');
  }
};
