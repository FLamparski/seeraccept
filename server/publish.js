/* global Meteor, Portals, Alerts, _ */

Meteor.publish('portals', function(who) {
  return Portals.find({
    submitter: who
  });
});

Meteor.publish('alerts', function() {
  return Alerts.find({
    uid: this.userId
  });
});

Portals.allow({
  update: function(userId, currentDoc, fieldNames) {
    // Don't let them chown if they're not the owner
    if (_.contains(fieldNames, 'owner') && currentDoc.owner !== userId) {
      return false;
    }
  }
});

Portals.deny({
  update: function(userId, doc, fields, modifier) {
    return _.contains(fields, 'submitter');
  }
});

Alerts.allow({
  remove: function(uid, alert) {
    return alert.uid === uid;
  }
});
