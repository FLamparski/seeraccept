/* global Template, _ */

var LOADING_MESSAGES = [
  'It\'s a fine day to submit a portal',
  'Be careful with high concentrations of XM',
  'Submit a duck',
  'Mo portals mo problems',
  'Remember not to submit military installations'
];
Template.loadingPage.helpers({
  loadingMessage: function() {
    return LOADING_MESSAGES[_.random(LOADING_MESSAGES.length - 1)];
  }
});

Template.noPortals.helpers({
  checkingMail: function() {
    return Meteor.user().profile.isCheckingMail;
  }
});
