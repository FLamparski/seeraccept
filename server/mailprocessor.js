/* global Meteor, _, Portals */

var cheerio = Meteor.npmRequire('cheerio');
/* global MailProcessor:true */
MailProcessor = {};

var INSECURE_HTTP = /^http:/;

var MessageIDs = new Mongo.Collection('messageIDs');

MailProcessor.process = function(userId, mail){
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
    console.log(userId + ' checkMail: Processing ' + mail.submitted.length + ' submissions');
    mail.submitted.map(function(msg){
      var imageUrl = cheerio.load(msg.html)('img').attr('src');
      if (INSECURE_HTTP.test(imageUrl)) {
        imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
      }
      return {
        'submitter': userId,
        'name': msg.subject.slice(26), //skips "Ingress Portal Submitted: "
        'image': imageUrl,
        'date': msg.date,
        'messageId': msg.messageId
      };
    }).forEach(function(obj){
        if(Portals.find({'$and': [{'image': obj.image},
            {'submitter': obj.submitter}]}).count() === 0){
            var model = _.pick(obj, 'submitter', 'name', 'image', 'messageId');
            console.log('new submission', obj.name, obj.messageId);
            model.history = [{
                timestamp: obj.date,
                what: 'submitted',
                messageId: obj.messageId
            }];
            Portals.insert(model);
        }
    });
    mail.live.map(function(msg){
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
            'title': msg.subject.slice(21), //skips "Ingress Portal Live: "
            'imageUrl': imageUrl,
            'intel': intelUrl,
            'date': msg.date,
            'messageId': msg.messageId
        };
    }).forEach(function(obj){
        var updoc = { $addToSet: { 'history': { 'timestamp': obj.date, 'what': 'live', messageId: obj.messageId }} };
        if (!(_.isUndefined(obj.intel))){
            updoc = _.extend(updoc, {$set: {intel: obj.intel}});
        }
        Portals.update(
            {$and: [{'image': obj.imageUrl}, {'submitter': obj.submitter}]},
            updoc
        );
    });
    mail.rejected.map(function(msg){
      var imageUrl = cheerio.load(msg.html)('img').attr('src');
      if (INSECURE_HTTP.test(imageUrl)) {
        imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
      }
      return {
        'submitter': userId,
        'title': msg.subject.slice(25), //skips "Ingress Portal Rejected: "
        'imageUrl': imageUrl,
        'date': msg.date,
        'messageId': msg.messageId
      };
    }).forEach(function(obj){
      Portals.update(
        {$and: [{'image': obj.imageUrl}, {'submitter': obj.submitter}]},
        {
        $addToSet: { 'history': { 'timestamp': obj.date, 'what': 'rejected', messageId: obj.messageId }}
        }
      );
    });
    mail.duplicates.map(function(msg){
      var imageUrl = cheerio.load(msg.html)('img').attr('src');
      if (INSECURE_HTTP.test(imageUrl)) {
        imageUrl = imageUrl.replace(INSECURE_HTTP, 'https:');
      }
      return {
        'submitter': userId,
        'title': msg.subject.slice(26), //skips "Ingress Portal Duplicate: "
        'imageUrl': imageUrl,
        'date': msg.date,
        'messageId': msg.messageId
      };
    }).forEach(function(obj){
      Portals.update(
        {$and: [{'image': obj.imageUrl}, {'submitter': obj.submitter}]},
        {
          $addToSet: { 'history': { 'timestamp': obj.date, 'what': 'duplicate', messageId: obj.messageId }}
        }
      );
    });
};
