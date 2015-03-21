/* eslint-env browser,jquery */
/* global Router, Tracker, Session, Meteor, Alerts, Portals, _ */

var currentUser = null;

Session.set('page.title', 'Ipsum');

Tracker.autorun(function() {
  document.title = Session.get('page.title');
});

Tracker.autorun(function() {
  Alerts.find({
    uid: Meteor.userId()
  }).observe({
    added: function(alert) {
      $.growl[alert.atype]({
        title: alert.type,
        message: alert.atext,
        location: 'br'
      });
    }
  });
});

function onlogincb() {
  _.chain(Alerts.find().fetch()).pluck('_id').each(function(a) {
    Alerts.remove({
      _id: a._id
    });
  });
}

Tracker.autorun(function() {
  if (!Meteor.userId()) {
    $('body').removeClass('app').addClass('landing');
  } else {
    if (currentUser !== Meteor.userId()) {
      onlogincb();
      currentUser = Meteor.userId();
    }
  }
});

var conntectedState = Meteor.status().connected;
var hasDisconnectedBefore = false;

Tracker.autorun(function() {
  var status = Meteor.status();
  if (status.connected !== conntectedState) {
    if (!status.connected) {
      hasDisconnectedBefore = true;
      $.growl.warning({
        title: 'You are offline',
        message: 'Some features may not work as expected',
        location: 'br'
      });
    } else if (hasDisconnectedBefore) {
      hasDisconnectedBefore = false;
      $.growl.notice({
        title: 'Connected to Ipsum',
        message: 'Your connection to Ipsum has been restored',
        location: 'br'
      });
    }
    conntectedState = status.connected;
  }
});

var currentUserID = null;
Tracker.autorun(function() {
  var uid = Meteor.userId(),
    interval;
  if (uid && uid !== currentUserID) {
    clearInterval(interval);
    interval = setInterval(function() {
      Meteor.call('refreshSession');
    }, 30 * 60 * 1000);
    currentUserID = uid;
  }
});

Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loadingPage',
  waitOn: function() {
    return [
      Meteor.subscribe('alerts')
    ];
  }
});
Router.onBeforeAction(function() {
  if (!Meteor.userId() && !Meteor.loggingIn()) {
    this.render('login');
  } else {
    this.next();
  }
}, {
  except: ['home', 'shared', 'logout', 'help']
});
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
  this.route('homeredir', {
    path: '/home',
    onBeforeAction: function() {
      Router.go('home');
    }
  });
  this.route('portals', {
    path: 'portals/:owner',
    onBeforeAction: function() {
      if (!Meteor.userId()) {
        this.render('login');
      }
      if (this.ready()) {
        var user = Meteor.users.findOne({
          _id: this.params.owner
        });
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
      if (this.ready()) {
        var ent;
        console.log('Looking for portals whose owner is entity id %s', this.params.owner);
        console.log('Currently has %d users', Meteor.users.find().count());
        if (Meteor.users.findOne({
            _id: this.params.owner
          })) {
          ent = Meteor.users.findOne({
            _id: this.params.owner
          });
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
