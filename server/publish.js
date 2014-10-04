function buildPermittedPortalsQuery (myId) {
  var query = { $or: [] };
  // Always be able to view your own portals.
  var allowedOwners = [ myId ];
  // Only publish portals this user has access to.
  // Obviously, those will be portals that are publicly
  // visible:
  query.$or[0] = { public_view: {$exists: true} };
  // Then, see who else published their portals to
  // this user - this active members of their groups.
  var groupIds = [];
  var groupPersons = Groups.find({
    $and: [
      {'members.person': this.userId},
      {active: true}
    ]
  }).map(function (group) {
    groupIds.push(group._id);
    var activeMembers = _.filter(group.members, function (member) {
      return member.active;
    });
    return _.pluck(Meteor.users.find({_id: {$in: activeMembers}}), '_id');
  });
  allowedOwners = _.flatten(allowedOwners.concat(groupPersons).concat(groupIds));
  query.$or[1] = { owner: {$in: allowedOwners} };
  return query;
}

Meteor.publish('portals', function(who) {
  check(who, Match.Optional(String));
  var query = buildPermittedPortalsQuery(this.userId);
  if (who) {
    if (_.contains(query.$or[1].owner.$in, who)) {
      query = { owner: who };
    } else {
      throw new Meteor.Error(401, 'You are not allowed to view this person\'s portals');
    }
  }
  console.info('Publishing portals to user %s by the following query:', this.userId);
  console.dir(query);
  return Portals.find(query);
});

/* if we go through all the trouble of keeping track
 * of who's allowed to view what portals, it only makes
 * sense to send submissions for those portals.
 */
Meteor.publish('submissions', function(who) {
  check(who, Match.Optional(String));
  var portalQuery = buildPermittedPortalsQuery(this.userId);
  if (who) {
    if (_.contains(portalQuery.$or[1].owner.$in, who)) {
      portalQuery = { owner: who };
    } else {
      throw new Meteor.Error(401, 'You are not allowed to view this person\'s portals');
    }
  }
  var allowedPortals = Portals.find(portalQuery);
  var submissionIds = [];
  allowedPortals.forEach(function(portal) {
    submissionIds = submissionIds.concat(portal.submissions);
  });
  console.log('Publishing %d submissions...', submissionIds.length);
  return Submissions.find({_id: {$in: submissionIds}});
});

Meteor.publish('alerts', function() {
    return Alerts.find({uid: this.userId});
});

Portals.allow({
  update: function (userId, currentDoc, fieldNames) {
    // Don't let them chown if they're not the owner
    if ( _.contains(fieldNames, 'owner') && currentDoc.owner !== userId) {
      return false;
    }
    // Only owners can edit top-level fields
    if (_.intersection(fieldNames, ['title', 'description', 'image_url', 'public_view']).length > 0 && currentDoc.owner === userId) {
      return true;
    }
    // Don't allow to update special fields. Merging portals will
    // be achieved by the merge_portals(one, two, ...) method.
    if (_.intersection(fieldNames, ['submissions', 'created_at']).length > 0) {
      return false;
    }
  }
});

Alerts.allow({
  remove: function(uid, alert){
    return alert.uid === uid;
  }
});

Meteor.publish('groups', function (uid) {
  check(uid, String);
  return Groups.find({$or: [
    { owner: uid },
    { 'members.person': uid }
  ]});
});

Groups.allow({
  remove: function(uid, group) {
    return uid && group.owner === uid;
  },
  insert: function(uid, group) {
    return uid && group.owner === uid;
  },
  update: function(uid, group, fields) {
    return uid && (uid === group.owner);
  }
});

Meteor.methods({
  group_add_user: function (gid, new_uid) {
    check(gid, String);
    var group = Groups.findOne(gid);
    if (!group) throw new Meteor.Error(404, 'No such group');
    if (_.contains(_.pluck(group.members, 'person'), new_uid)) {
      throw new Meteor.Error(412, 'Already in group');
    }
    var membership = {
        person: new_uid,
        active: false,
        role: 'member'
    };
    Groups.update(group._id, {
      $addToSet: { members: membership}
    });
    return membership;
  },
  group_membership_update: function(gid, action, member_id) {
    check(gid, String);
    check(action, String);
    check(member_id, String);
    var group = Groups.findOne(gid);
    if (!group) throw new Meteor.Error(404, 'No such group');
    var lookup = {'members.person': member_id};
    var update = {};
    switch (action) {
      case 'make admin':
        if (_.findWhere(group.members, { person: member_id }).role === 'admin') {
          update.$set = {
            'members.$.role': 'admin'
          };
        } else {
          throw new Meteor.Error(401, 'Only admins can change roles');
        }
        break;
      case 'make moderator':
        if (_.findWhere(group.members, { person: member_id }).role === 'admin') {
          update.$set = {
            'members.$.role': 'moderator'
          };
        } else {
          throw new Meteor.Error(401, 'Only admins can change roles');
        }
        break;
      case 'make member':
        if (_.findWhere(group.members, { person: this.userId }).role === 'admin') {
          update.$set = {
            'members.$.role': 'member'
          };
        } else {
          throw new Meteor.Error(401, 'Only admins can change roles');
        }
        break;
      case 'activte':
        if (_.findWhere(group.members, { person: this.userId })) {
          update.$set = {
            'members.$.active': true
          };
        } else {
          throw new Meteor.Error(400, 'Only users can activate themselves');
        }
        break;
      case 'deactivte':
        if (_.findWhere(group.members, { person: this.userId })) {
          update.$set = {
            'members.$.active': true
          };
        } else {
          throw new Meteor.Error(400, 'Only users can activate themselves');
        }
        break;
      default:
        throw new Meteor.Error(400, 'Unrecognised group operation');
    }
    if(_.has(update, '$set')) {
      Groups.update(lookup, update);
      return group;
    }
  }
});
