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

window._pstatus = function(portal){
    return portal.history // Get the events for this portal
        .sort(function(a, b){
            // Status is the most recent event's what value
            return b.timestamp - a.timestamp;
    })[0].what;
};

window._portals_statusSortPredicate = function(a, b) {
    var order = { 'live': 0, 'rejected': 1, 'submitted': 2 },
        sA = order[_pstatus(a)],
        sB = order[_pstatus(b)];
    return sA - sB;
};

window._portals_ascDateSortPredicate = function(a, b) {
    var st = function(p) { return o.history.sort(function(a, b){ return b.timestamp - a.timestamp; })[0].timestamp; };
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
                return '';
            },
    css_class: function(portal){
                return {
                    'live': 'success',
                    'submitted': 'info',
                    'rejected': 'danger'
                }[_pstatus(portal)];
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
