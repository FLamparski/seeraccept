/* global Schemas:true, SimpleSchema */

Schemas = {};

/**
 * Ipsum is mainly about portals, but they're actually
 * based on multiple things. Here's the root type.
 */
Schemas.Portal = new SimpleSchema({
    owner: { type: String },
    title: { type: String },
    description: { type: String, optional: true },
    image_url: { type: String },
    submissions: { type: [String] },
    notes: { type: [Schemas.PortalNote], optional: true },
    created_at: { type: Date },
    public_view: { type: Boolean, optional: true }
});

Schemas.PortalNote = new SimpleSchema({
  owner: { type: String },
  content: { type: String },
  display_date: { type: Date },
  created_date: { type: Date },
  last_edited: { type: Date, optional: true }
});

Schemas.Event = new SimpleSchema({
    message_id: { type: String }, // unique key for events
    timestamp: { type: Date },
    what: {
        type: String,
        allowedValues: ['submitted', 'live', 'rejected', 'duplicate', 'manual_override']
    },
    override_reason: { type: String, optional: true },
    title: { type: String },
    description: { type: String, optional: true }
});

Schemas.Submission = new SimpleSchema({
    submitter: { type: String },
    image_url: { type: String }, // unique key (other than the _id)
    intel_url: { type: String, optional: true },
    submission_date: { type: Date },
    history: { type: [Schemas.Event] }
});

Schemas.Membership = new SimpleSchema({
    person: { type: String },
    active: { type: Boolean },
    role: { type: String, allowedValues: ['admin', 'moderator', 'member'] }
});

Schemas.Group = new SimpleSchema({
    owner: { type: String },
    name: { type: String },
    members: { type: [Schemas.Membership] }
});

Schemas.Alert = new SimpleSchema({
  uid: { type: String },
  atext: { type: String },
  atype: { type: String, allowedValues: ['info', 'warning', 'danger', 'success'] }
});

/* global Portals:true */
Portals = new Mongo.Collection('portals');
Portals.attachSchema(Schemas.Portal);

/* global Submissions:true */
Submissions = new Mongo.Collection('submissions');
Submissions.attachSchema(Schemas.Submission);

/* global Groups:true */
Groups = new Mongo.Collection('groups');
Groups.attachSchema(Schemas.Group);

/* global Logs:true */
Logs = new Mongo.Collection('logs');

/* global Alerts:true */
Alerts = new Mongo.Collection('alerts');
