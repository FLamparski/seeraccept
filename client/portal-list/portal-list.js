var PORTAL_STATES_ALL = _.keys(portalLib.PORTAL_STATE_TABLE);

Template.portals.created = function() {
  Session.set('portalSort', 'title asc');
  Session.set('portalNameFilter', '');
  Session.set('portalStateFilter', PORTAL_STATES_ALL);
};

function resizePortalTableHeader(){
  $('#portalTable > header').width($('#portalTable').width())
    .css('top', ($('.app-bar').height() - 10).toString().concat('px'));
  $('#portalTable > table tr:nth-child(1) > td').each(function(i){
    if (i === 0) {
      $('#portalTable > header > table tr').children().eq(i).width(54);
    } else {
      $('#portalTable > header > table tr').children().eq(i).width($(this).width());
    }
  });
}

var toolbarFilterEvents = {

};

Template.portals.rendered = function() {
  this.$('#portalTable > header').affix({
    offset: {
      top: $('.app-bar').height() + 10
    }
  });
  $(window).on('resize', resizePortalTableHeader);
};

Template.portals.destroyed = function() {
  $('.portals-filter').off('click', togglePortalFilterBox);
};

function portalTTR(portal) {
  var ttr = portalLib.getWaitTime(portal).days;
  return ttr;
}

var sortPredicates = {
  'submitted': function(portal) {
    return portalLib.getSubmissionsForPortal(portal).map(function(submission) {
      return _.sortBy(submission.history, 'timestamp')[0];
    }).sort()[0];
  },
  'state': function(portal) {
    return portalLib.PORTAL_STATE_TABLE[portalLib.getPortalState(portal)];
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
    console.log('portals data context start');
    var portals = this.portals.fetch();
    // If no portals...
    if (!portals.length) {
      console.log('portals data context terminated');
      return null;
    }
    // Always sort by name first
    var thePortals = _.sortBy(portals, 'title');
    var sort = Session.get('portalSort');
    var sortOn = sort.split(' ')[0];
    var sortDir = sort.split(' ')[1];
    // Sort on something besides the title
    if (sortOn !== 'title') {
      thePortals = _.sortBy(thePortals, sortPredicates[sortOn]);
    }
    // Reverse sorting - _.sortBy() sorts ascending
    if (sortDir === 'desc') {
      thePortals = thePortals.reverse();
    }
    console.log('  sort stage exit with %d portals', thePortals.length);
    // Filtering - we can do name and state
    var nameFilter = Session.get('portalNameFilter');
    var stateFilter = Session.get('portalStateFilter');
    if (nameFilter && nameFilter.length > 0) {
      thePortals = _.filter(thePortals, function(portal){
        return new RegExp(nameFilter, 'i').test(portal.title);
      });
    }
    console.log('  we have a title filter /%s/i => %d portals', nameFilter, thePortals.length);
    /*if (stateFilter) {
      thePortals = _.filter(thePortals, function(portal){
        return _.contains(stateFilter, portalLib.getPortalState(portal));
      });
    }*/
    console.log('portals data context end with %d portals', thePortals.length);
    $('#portalTable > header').trigger('custom.update');
    return thePortals;
  },
  isActive: function(pid) {
    return Session.get('selectedPortalId') === pid ? 'active' : '';
  },
  submissionDate: function() {
    var eventDates = portalLib.getSubmissionsForPortal(this).map(function(sub) {
      return _.pluck(sub.history, 'timestamp');
    });
    var subDate = _.flatten(eventDates).sort()[0];
    return moment(subDate).format('DD MMMM YYYY');
  },
  portalStatus: function() {
    return portalLib.getPortalState(this);
  },
  hasReview: function() {
    return portalLib.getWaitTime(this).conclusive;
  },
  daysToReview: function() {
    return portalTTR(this);
  }
});

Template.portals.events({
  'click [data-sort-by]': function(evt, tpl) {
    var sortBy = tpl.$(evt.currentTarget).data('sort-by');
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
    Session.set('portalSort', newSort);
  },
  'affix.bs.affix #portalTable > header': resizePortalTableHeader,
  'custom.update #portalTable > header': resizePortalTableHeader,
  'keyup *[data-filter-by=name] > input': function(evt) {
    Session.set('portalNameFilter', evt.currentTarget.value);
  },
  'change *[data-filter-by=state] input[type=checkbox]': function() {
    var allowedStates;
    allowedStates = $('*[data-filter-by=state] input[data-filter-state]')
      .filter(function() { return this.checked; })
      .map(function() { return this.dataset.filterState; })
      .toArray();
    Session.set('portalStateFilter', allowedStates);
  },
  'click a[data-close=portal-filters]': function() {
    $('.app-bar .portals-filter').toggleClass('active');
    $('#portalTable .filter-bar').toggleClass('hidden');
  }
});
