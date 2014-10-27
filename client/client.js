console.log("Entering client.js");

var currentUser = null;

var onlogincb = function(){
    _.chain(Alerts.find().fetch()).pluck('_id').each(function(a){
        Alerts.remove({_id: a._id});
    });
    Alerts.find({uid: Meteor.userId()}).observe({
      added: function(alert) {
        $.growl[alert.atype]({title: alert.type, message: alert.atext, location: 'br'});
      }
    });
    Meteor.call('check_mail', function(){});
};

Deps.autorun(function(){
  if(!Meteor.userId()){
    $('body').removeClass('app').addClass('landing');
  } else {
    if (currentUser != Meteor.userId()) {
      onlogincb();
      currentUser = Meteor.userId();
    }
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
Router.onBeforeAction(function(pause){
  if(!Meteor.userId() && !Meteor.loggingIn()){
    this.render('login');
    pause();
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
      onBeforeAction: function (pause){
        console.log('/dashboard onBefore');
        Session.set('pageSubtitle', 'Your Dashboard'); 
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
    onBeforeAction: function(pause) {
      if (Meteor.loggingIn()) {
        this.render('spincover');
        pause();
      } else if (Meteor.userId()) {
        Router.go('dashboard');
        pause();
      } else {
        this.render('login');
        pause();
      }
    }
  });
  this.route('portals', {
    path: 'portals/:owner',
    onBeforeAction: function(pause) {
      if(this.ready()) {
        var user = Meteor.users.findOne({_id: this.params.owner});
        if (this.params.owner === 'me') {
          console.log('route: my portals');
          Session.set('screenTitle', 'Your Submissions');
          this.params.owner = Meteor.userId();
        } else if (user) {
          Session.set('screenTitle', user.profile.nickname + '\'s Submissions');
        }
      }
    },
    waitOn: function() {
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
    onBeforeAction: function(pause) {
      Session.set('selectedPortalId', this.params.portalId);
      render('portals');
      pause();
    }
  });
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

Template.header.events({
  'click .drawer-toggle': function(tpl, e) {
    $('.sidebar-nav-drawer').drawer('toggle', 150);
  }
});


Template.sidebar.rendered = function() {
  this.$('.sidebar-nav-drawer').drawer('left');
};

Template.sidebar.events({
  'click a': function() {
    $('.sidebar-nav-drawer').drawer('hide');
  }
});

var LOADING_MESSAGES = [
  "I stole this feature from Slack",
  "Be careful with high concentrations of XM",
  "Submit a duck",
  "Mo portals mo problems"
];
Template.loadingPage.helpers({
  loadingMessage: function() {
    return LOADING_MESSAGES[_.random(LOADING_MESSAGES.length)];
  }
});

/**
 * Cheap equality operator for Handlebars
 */
UI.registerHelper('eq', function(a, b) {
  return a == b;
});
/**
 * Lowercase of str for use in templates
 */
UI.registerHelper('downcase', function(str) {
  return str && str.toLowerCase();
});
/**
 * Returns 'active' if the route @route is the current
 * route. The Fragment version does a regexp for a
 * more fuzzy match.
 */
UI.registerHelper('activeFor', function(route){
  return (Router.current().path === '/'  + route) ? 'active' : '';
});
UI.registerHelper('activeForFragment', function(routeFragment){
  if (new RegExp(routeFragment, 'i').test(Router.current().path)) {
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
UI.registerHelper('routeClass', function(){
  return Router.current().path.substring(1).replace('/', ' ');
});
