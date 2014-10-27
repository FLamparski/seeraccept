console.log("Entering schemas.js");

Schemas = {};
Schemas.PortalEvent = new SimpleSchema({
    timestamp: {type: Date, label: "Date of event"},
    what: {
        type: String,
        allowedValues: ['duplicate', 'live', 'submitted', 'rejected', 'manual_override']
    },
    description: {type: String, optional: true}
});
Schemas.Portal = new SimpleSchema({
    submitter: { type: String, label: "Submitter ID" },
    name: { type: String, label: "Portal Title" },
    image: { type: String, label: "Portal Photo" },
    intel: { type: String, optional: true },
    history: { type: [Schemas.PortalEvent], minCount: 1 }
});
Schemas.Alerts = new SimpleSchema({
  uid: {type: String},
  atype: {type: String},
  atext: {type: String}
});

Alerts = new Meteor.Collection('alerts');
Alerts.attachSchema(Schemas.Alerts);

Portals = new Meteor.Collection('portals');
Portals.attachSchema(Schemas.Portal);

// ---- Preparing for a data model update --------------------------------------

_Schemas = {};

_Schemas.Portal = new SimpleSchema({
    owner: { type: String },
    title: { type: String },
    image_url: { type: String },
    submissions: { type: [String] }
});

_Schemas.Event = new SimpleSchema({
    timestamp: { type: Date },
    what: {
        type: String,
        allowedValues: ['submitted', 'live', 'rejected', 'duplicate', 'ninja']
    },
    title: { type: String }
});

_Schemas.Submission = new SimpleSchema({
    submitter: { type: String },
    image_url: { type: String },
    intel_url: { type: String, optional: true },
    date: { type: Date },
    history: { type: [_Schemas.Event] }
});

_Schemas.Membership = new SimpleSchema({
    person: { type: String },
    active: { type: Boolean },
    role: { type: String, allowedValues: ['admin', 'moderator', 'member'] }
});

_Schemas.Group = new SimpleSchema({
    owner: { type: String },
    name: { type: String },
    members: { type: [_Schemas.Membership] }
});
