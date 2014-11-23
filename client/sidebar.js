/* global Template, Meteor, $ */

Template.sidebar.rendered = function() {
  this.$('.sidebar-nav-drawer').drawer('left');
};

Template.sidebar.helpers({
  Meteor: function() {
    return Meteor;
  }
});

Template.sidebar.events({
  'click a': function() {
    $('.sidebar-nav-drawer').drawer('hide');
  }
});
