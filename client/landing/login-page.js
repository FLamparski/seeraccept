Template.login.events({
    "click .sa-btn-login": function (e, tmpl) {
        Meteor.loginWithGoogle({
            requestPermissions: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email', 'https://mail.google.com/'],
            requestOfflineToken: true
        }, function (err) {
            if(err) {
                console.error(err);
            } else {
                console.log("User logged in.");
                Router.go('home');
            }
        });
    }
});
