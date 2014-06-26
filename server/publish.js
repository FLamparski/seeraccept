console.log("Entering server/publish.js");

Portals = new Meteor.Collection('portals');
Portals.attachSchema(Schemas.Portal);
Alerts = new Meteor.Collection('alerts');


Meteor.publish('my-portals', function() {
    return Portals.find({submitter: this.userId});
});

Meteor.publish('alerts', function() {
    return Alerts.find({uid: this.userId});
});

Portals.allow({
    insert: function(userId, doc) {
       return userId && doc.submitter === userId;
    },
    update: function(userId, doc, f, m){
        return doc.submitter === userId;
    },
    remove: function(userId, doc){
        return doc.submitter === userId;
    }
});

Portals.deny({
    update: function (userId, doc, fields, modifier ){
        return _.contains(fields, 'submitter');
    }
});
