console.log("Entering client.js");

Portals = new Meteor.Collection('portals');
Portals.attachSchema(Schemas.Portal);
Alerts = new Meteor.Collection('alerts');

Meteor.subscribe('my-portals');
Meteor.subscribe('alerts');

Template.user_loggedOut.events({
    "click .sa-btn-login": function (e, tmpl) {
        Meteor.loginWithGoogle({
            requestPermissions: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email', 'https://mail.google.com/'],
            requestOfflineToken: true
        }, function (err) {
            if(err) {
                console.error(err);
            } else {
                console.log("User logged in.");
            }
        });
    }
});

Template.user_loggedIn.events({
    "click #logout": function (e, tmpl) {
        Meteor.logout(function (err) {
            if(err){
                console.error(err);
            } else {
                console.log("User logged out.");
            }
        });
    }
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
    return (Math.floor(10*(n_selected / n_all * 100))/10).toString() + "%";
}

Template.barchart.helpers({
    percentSubmitted: function(){
        return _percentStatus('submitted');
    },
    percentRejected: function(){
        return _percentStatus('rejected');
    },
    percentLive: function(){
        return _percentStatus('live');
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
