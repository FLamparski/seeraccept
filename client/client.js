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
  this.route('dashboard');
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
  this.route('portals');
  this.route('portalDetails', {
    path: 'portal/:portalId',
    onBeforeAction: function(pause) {
      Session.set('portalId', this.params.portalId);
      Router.go('portals');
      pause();
    }
  });
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

function _percentStatus(what){
    var n_all = Portals.find({}).count();
    var n_selected = Portals.find({}).fetch().filter(function(el){
            return _pstatus(el) === what;
            }).length;
    return n_selected / n_all * 100;
}

Template.barchart.helpers({
    percentSubmittedCss: function(){
        return _percentStatus('submitted').toString() + '%';
    },
    percentRejectedCss: function(){
        return _percentStatus('rejected').toString() + '%';
    },
    percentLiveCss: function(){
        return _percentStatus('live').toString() + '%';
    },
    percentSubmittedView: function(){
        return (Math.round(_percentStatus('submitted') * 10) / 10).toString() + '%';
    },
    percentRejectedView: function(){
        return (Math.round(_percentStatus('rejected') * 10) / 10).toString() + '%';
    },
    percentLiveView: function(){
        return (Math.round(_percentStatus('live') * 10) / 10).toString() + '%';
    },
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

function portalResponseTimes(){
return Portals.find({}).fetch()
    .filter(function(el){
        return el.history.length > 1;
    })
    .map(function(el){
        return Math.abs(el.history[0].timestamp - el.history[1].timestamp);
    });
}

Template.dashboard.helpers({
    shortestResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(
            _.min(portalResponseTimes()) / (1000*3600*24));
    },
    longestResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(
            _.max(portalResponseTimes()) / (1000*3600*24));
    },
    averageResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(Portals.find({}).fetch()
            .filter(function(el){
                return el.history.length > 1;
            })
            .map(function(el){
                return Math.abs(el.history[0].timestamp - el.history[1].timestamp);
            })
            .reduce(function(prev, curv){
                return (prev+curv) / 2;
            }) / (1000*3600*24));
    }
});

