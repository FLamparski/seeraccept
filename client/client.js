console.log("Entering client.js");

var currentUser = null;

Tracker.autorun(function() {
  activeAlertObserver = Alerts.find({uid: Meteor.userId()}).observe({
    added: function(alert) {
      $.growl[alert.atype]({title: alert.type, message: alert.atext, location: 'br'});
    }
  });
});

var onlogincb = function(){
    _.chain(Alerts.find().fetch()).pluck('_id').each(function(a){
        Alerts.remove({_id: a._id});
    });
};

Tracker.autorun(function(){
  if(!Meteor.userId()){
    $('body').removeClass('app').addClass('landing');
  } else {
    if (currentUser != Meteor.userId()) {
      onlogincb();
      currentUser = Meteor.userId();
    }
  }
});

var conntectedState = Meteor.status().connected;

Tracker.autorun(function(){
  var status = Meteor.status();
  if (status.connected !== conntectedState) {
    if (!status.connected) {
      $.growl.warning({title: 'You are offline', message: 'There is no connection to the ipsum server', location: 'br'});
    } else {
      $.growl.notice({title: 'Connected to Ipsum', message: 'You are connected to the ipsum server in real time', location: 'br'});
    }
    conntectedState = status.connected;
  }
});

var _old_uid = null;
Tracker.autorun(function(){
  var uid = Meteor.userId(), interval;
  if (uid && uid != _old_uid) {
    clearInterval(interval);
    interval = setInterval(function() {
      Meteor.call('refreshSession');
    }, 30 * 60 * 1000);
    _old_uid = uid;
  }
});

Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loadingPage',
  waitOn: function () {
    return [
      Meteor.subscribe('alerts')
    ];
  }
});
Router.onBeforeAction(function(){
  if(!Meteor.userId() && !Meteor.loggingIn()){
    this.render('login');
  } else {
    this.next();
  }
}, {except: ['home', 'shared', 'logout', 'help']});
Router.map(function() {
  this.route('logout', {
    action: function() {
      Meteor.logout(function(err) {
        if (err) {
          console.error(err);
        }
        Session.keys = {};
        Router.go('home');
      });
    }
  });
  this.route('dashboard', {
      onBeforeAction: function (){
        console.log('/dashboard onBefore');
        Session.set('pageSubtitle', 'Your Dashboard');
        this.next();
      },
      waitOn: function() {
        console.log('/dashboard waitOn');
        return Meteor.subscribe('portals', Meteor.userId());
      },
      data: function() {
        console.log('/dashboard data');
        if (this.ready()) {
          console.log('/dashboard data - ready');
          return { allReady: true };
        }
      }
  });
  this.route('home', {
    path: '/',
    onBeforeAction: function() {
      if (Meteor.loggingIn()) {
        this.render('spincover');
      } else if (Meteor.userId()) {
        Router.go('dashboard');
        this.next();
      } else {
        this.render('login');
      }
    }
  });
  this.route('portals', {
    path: 'portals/:owner',
    onBeforeAction: function() {
      if(!Meteor.userId()){
        this.render('login');
      }
      if(this.ready()) {
        var user = Meteor.users.findOne({_id: this.params.owner});
        if (this.params.owner === 'me') {
          console.log('route: my portals');
          Session.set('screenTitle', 'Your Submissions');
          this.params.owner = Meteor.userId();
        } else if (user) {
          Session.set('screenTitle', user.profile.nickname + '\'s Submissions');
        }
        this.next();
      }
    },
    waitOn: function() {
      if (!Meteor.userId()) {
        console.log('You are not logged in');
        Router.go('home');
      }
      if (this.params.owner === 'me') {
        console.log('magic me found: rewrite to %s', Meteor.userId());
        this.params.owner = Meteor.userId();
      }
      console.log('Will wait for %s\'s portals and users', this.params.owner);
      return [
        Meteor.subscribe('portals', this.params.owner),
        {
          ready: function() {
            var nusers = Meteor.users.find().count();
            return nusers > 0;
          }
        }
      ];
    },
    data: function() {
      if(this.ready()){
        var ent;
        console.log('Looking for portals whose owner is entity id %s', this.params.owner);
        console.log('Currently has %d users', Meteor.users.find().count());
        if (Meteor.users.findOne({_id: this.params.owner})) {
          ent = Meteor.users.findOne({_id: this.params.owner});
          console.log('Found user %s for %s', ent.profile.nickname, ent._id);
          ent._type = ent._id === Meteor.userId() ? 'self' : 'other';
        }
        return Portals.find({submitter: ent._id});
      }
    }
  });
  this.route('portalDetails', {
    path: 'portal/:portalId',
    onBeforeAction: function() {
      Session.set('selectedPortalId', this.params.portalId);
      this.render('portals');
    }
  });
});


Template.header.rendered = function(){
  var self = this;
  var oldPos = self.$('.dropdown-menu').offset();
  var myWidth = self.$('.dropdown-menu').outerWidth();
  var activatorWidth = self.$('.dropdown-toggle').outerWidth();
  var newPos = { top: oldPos.top, left: activatorWidth - myWidth };
  console.log('Moving the dropdown menu from (%d, %d) to (%d, %d)', oldPos.left,
      oldPos.top, newPos.left, newPos.top);
  self.$('.dropdown-menu').offset(newPos);
};

Template.header.helpers({
  'status': Meteor.status
});

Template.header.events({
  "click .refresh": function (e, tmpl) {
    console.log("Check mail start...");
    if(!Meteor.userId()){
      console.error("Not yet logged in.");
      return;
    } else {
      Meteor.call('check_mail', function (){});
    }
  },
  "click .portals-filter": function (e, tmpl) {
    $('#portalTable > .filter-bar').toggleClass('hidden');
    tmpl.$('.portals-filter').toggleClass('active');
  },
  'click .drawer-toggle': function(tpl, e) {
    $('.sidebar-nav-drawer').drawer('toggle', 150);
  }
});

/*Template.portalList.helpers({
    portals: function (){
                return Portals.find({}).fetch()
                .sort(_portals_sortPredicate);
            },
    pstatus: function (portal){
                if(!this) return "wait";
                else return _pstatus(portal);
            },
    is_active: function(portal){
                return Session.get("selected_portal") === portal._id ? 'active' : '';
            },
    css_class: function(portal){
                return {
                    'live': 'success',
                    'submitted': 'info',
                    'rejected': 'danger'
                }[_pstatus(portal)];
            }
});*/

/*Template.portalList.events({
    "click .portal-item": function() {
        Session.set("selected_portal", this._id);
    }
});*/





function get_current_portal(){
    return Portals.findOne({_id: Session.get("selected_portal")});
}

Template.portalDetails.helpers({
    selected_portal: function(){
        return Session.get("selected_portal");
    },
    events: function(){
        var p = get_current_portal();
        return p ? p.history.sort(pHistoryPred) : null;
    },
    relativeDate: function(timestamp){
        return Math.ceil((new Date() - timestamp) / (1000 * 3600 * 24)).toString();
    },
    intel: function(){
        var p = get_current_portal();
        return p ? p.intel : null;
    },
    name: function(){
        var p = get_current_portal();
        return p ? p.name : null;
    },
    image: function(){
        var p = get_current_portal();
        return p ? p.image : null;
    },
    stats: function(){
        var p = get_current_portal();
        if(!p) return "please wait";
        var text = "This portal ",
            hist = p.history.sort(pHistoryPred);
        if(p.history.length > 1) {
            text += "took " 
               + Math.round((hist[0].timestamp - hist[1].timestamp)/(1000*3600*24))
               + " days to "
               + (hist[0].what === 'live' ? 'go live' : 'be rejected') + ".";
        } else {
            text += "is still waiting for decision.";
        }
        return text;
    }
});



Template.sidebar.rendered = function() {
  this.$('.sidebar-nav-drawer').drawer('left');
};

Template.sidebar.helpers({
  Meteor: function() {
    return Meteor
  }
});

Template.sidebar.events({
  'click a': function() {
    $('.sidebar-nav-drawer').drawer('hide');
  }
});

var LOADING_MESSAGES = [
  "It's a fine day to submit a portal",
  "Be careful with high concentrations of XM",
  "Submit a duck",
  "Mo portals mo problems",
  "Remember not to submit military installations"
];
Template.loadingPage.helpers({
  loadingMessage: function() {
    return LOADING_MESSAGES[_.random(LOADING_MESSAGES.length)];
  }
});

/**
 * Cheap equality operator for Handlebars
 */
Template.registerHelper('eq', function(a, b) {
  return a == b;
});
/**
 * Lowercase of str for use in templates
 */
Template.registerHelper('downcase', function(str) {
  return str && str.toLowerCase();
});
/**
 * Sentence case: capitalise the first letter
 */
Template.registerHelper('sentenceCase', function(str) {
  return str && str[0].toUpperCase() + str.slice(1);
});
/**
 * Returns 'active' if the route @route is the current
 * route. The Fragment version does a regexp for a
 * more fuzzy match.
 */
Template.registerHelper('activeFor', function(route){
  return (Router.current().url === '/'  + route) ? 'active' : '';
});
Template.registerHelper('activeForFragment', function(routeFragment){
  if (new RegExp(routeFragment, 'i').test(Router.current().url)) {
    return 'active';
  } else {
    return '';
  }
});
/**
 * Generate a CSS class for the current route.
 * Does it by removing the leading slash, and
 * then substituting trailing slashes with spaces,
 * so routes like /portals/me become
 * CSS classes 'portals me'.
 */
Template.registerHelper('routeClass', function(){
  return Router.current().url.substring(1).replace('/', ' ');
});
