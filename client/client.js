console.log("Entering client.js");

Portals = new Meteor.Collection('portals');
Portals.attachSchema(Schemas.Portal);
Alerts = new Meteor.Collection('alerts');

Meteor.subscribe('my-portals');
Meteor.subscribe('alerts');

var onlogincb = _.once(function(){
    _.chain(Alerts.find().fetch()).pluck('_id').each(function(a){
        Alerts.remove({_id: a._id});
    });
    Meteor.call('check_mail', function(){});
});

Deps.autorun(function(){
    if(!Meteor.userId()){
        $('body').removeClass('app').addClass('landing');
    } else {
        $('body').addClass('app').removeClass('landing');
        onlogincb();
    }
});

Router.configure({
  layoutTemplate: 'layout'
});
Router.waitOn(function(){
  return [Meteor.subscribe('my-portals'), Meteor.subscribe('alerts')];
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
        Session.set('pageSubtitle', 'Your Dashboard'); 
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
    onBeforeAction: function(pause) {
      Session.set('pageSubtitle', 'Your Submissions');
    } 
  });
  this.route('portalDetails', {
    path: 'portal/:portalId',
    onBeforeAction: function(pause) {
      Session.set('portalId', this.params.portalId);
      Router.go('portals');
      pause();
    }
  });
  this.route('help');
});

Template.header.events({
    "click #checkMail": function (e, tmpl) {
        console.log("Check mail start...");
        if(!Meteor.userId()){
            console.error("Not yet logged in.");
            return;
        } else {
            Meteor.call('check_mail', function (){});
        }
    }
});

Template.alerts.alerts = function (){
    return Alerts.find({});
};

Template.alerts.events({
    "click button.close": function(e, tmpl){
        console.log('alerts.dismiss handler (', this, e, tmpl, ')');
        Alerts.remove({_id: this._id});
    }
});

function pHistoryPred(a, b){
    return b.timestamp - a.timestamp;
}

window._pstatus = function(portal){
    return portal.history // Get the events for this portal
        .sort(pHistoryPred)[0].what;
};

window._portals_statusSortPredicate = function(a, b) {
    var order = { 'live': 0, 'rejected': 1, 'submitted': 2 },
        sA = order[_pstatus(a)],
        sB = order[_pstatus(b)];
    return sA - sB;
};

window._portals_ascDateSortPredicate = function(a, b) {
    var st = function(p) { return o.history.sort(pHistoryPred)[0].timestamp; };
    return st(b) - st(b);
};

window._portals_sortPredicate = _portals_statusSortPredicate;

Template.portalList.helpers({
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
});
Template.portalList.events({
    "click .portal-item": function() {
        Session.set("selected_portal", this._id);
    }
});





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

Template.header.events({
  'click a.refresh': function (){
    console.log('click a.refresh');
    Meteor.call('check_mail', function(){
      console.log(arguments);
    });
  }
});
