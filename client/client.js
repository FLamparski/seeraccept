console.log("Entering client.js");

var Portals = new Meteor.Collection('portals');
Portals.attachSchema(Schemas.Portal);

Meteor.subscribe('my-portals');

Template.user_loggedOut.events({
    "click .sa-btn-login": function (e, tmpl) {
        Meteor.loginWithGoogle({
            requestPermissions: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email', 'https://mail.google.com/']
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
        if(!userId){
            console.error("Not yet logged in.");
            return;
        }
    }
});
