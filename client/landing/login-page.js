/* eslint-env browser,jquery */
/* global Template, Meteor, Router */

Template.login.events({
  'click .sa-btn-login': function() {
    Meteor.loginWithGoogle({
      requestPermissions: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email', 'https://mail.google.com/'],
      requestOfflineToken: true,
      loginStyle: 'redirect'
    }, function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('User logged in.');
        Router.go('home');
      }
    });
  }
});
