Template.portals.created = function() {
  Session.set('portalSort', 'title asc');
  Session.set('portalNameFilter', '');
};

function portalStatus(portal) {
  return _.chain(portal.history).sortBy('timestamp').last().value().what;
}
function portalTTR(portal) {
  var sortedHistory = _.chain(portal.history).sortBy('timestamp');
  var earliest = sortedHistory.first().value().timestamp;
  var latest = sortedHistory.last().value().timestamp;
  return moment.duration(moment(latest).diff(moment(earliest))).asDays();
}

var sortPredicates = {
  'submitted': function(portal) {
    return _.chain(portal.history).sortBy('timestamp')
            .findWhere({what: 'submitted'}).value().timestamp;
  },
  'state': function(portal) {
    return {
      'live': 0,
      'duplicate': 1,
      'rejected': 2
    }[portalStatus(portal)] || 1000;
  },
  'ttr': function(portal) {
    return portalTTR(portal);
  }
  // no title as that's the default
};

Template.portals.helpers({
  sortBy: function(field) {
    var sort = Session.get('portalSort');
    return sort.split(' ')[0] === field;
  },
  sortState: function(field) {
    var sort = Session.get('portalSort');
    var sort_field = sort.split(' ')[0];
    var dir = sort.split(' ')[1];
    if (field === sort_field) {
      return 'sort-' + dir;
    } else {
      return 'sort';
    }
  },
  portals: function() {
    if (!this.portals) return null;
    var thePortals = _.sortBy(this.portals.fetch(), 'name');
    var sort = Session.get('portalSort');
    var sortOn = sort.split(' ')[0];
    var sortDir = sort.split(' ')[1];
    if (sortOn !== 'title') {
      thePortals = _.sortBy(thePortals, sortPredicates[sortOn]);
    }
    if (sortDir === 'desc') {
      thePortals = thePortals.reverse();
    }
    var nameFilter = Session.get('portalNameFilter');
    if (nameFilter.length > 0) {
      thePortals = _.filter(thePortals, function(portal){
        return new RegExp(nameFilter, 'i').test(portal.name);
      });
    }
    return thePortals;
  },
  isActive: function(pid) {
    return Session.get('selectedPortalId') === pid ? 'active' : '';
  },
  submissionDate: function() {
    return moment(_.chain(this.history).filter(function(event) {
      return event.what === 'submitted';
    }).sortBy('timestamp').first().value().timestamp).format('DD MMMM YYYY');
  },
  portalStatus: function() {
    return portalStatus(this);
  },
  hasReview: function() {
    return this.history.length > 1;
  },
  daysToReview: function() {
    return Math.round(portalTTR(this));
  }
});

Template.portals.events({
  'click [data-sort-by]': function(evt, tpl) {
    var sortBy = tpl.$(evt.currentTarget).data('sort-by');
    console.log('Sort by %s clicked', sortBy);
    var oldSort = Session.get('portalSort');
    var oldSortBy = oldSort.split(' ')[0];
    var oldSortDir = oldSort.split(' ')[1];
    var flipDir = {
      asc: 'desc',
      desc: 'asc'
    };
    var newSort = 'title asc'; // default in case something bad happens
    if (sortBy === oldSortBy) {
      newSort = sortBy + ' ' + flipDir[oldSortDir];
    } else {
      newSort = sortBy + ' asc';
    }
    console.log('New sort: %s', newSort);
    Session.set('portalSort', newSort);
  }
});
