/* global Meteor, Template, $ */

Template.header.rendered = function(){
  var self = this;
  var oldPos = self.$('.dropdown-menu').offset();
  var myWidth = self.$('.dropdown-menu').outerWidth();
  var activatorWidth = self.$('.dropdown-toggle').outerWidth();
  var newPos = { top: oldPos.top, left: activatorWidth - myWidth };
  console.log('Moving the dropdown menu from (%d, %d) to (%d, %d)', oldPos.left,
      oldPos.top, newPos.left, newPos.top);
  self.$('.dropdown-menu').offset(newPos);
};

Template.header.helpers({
  'status': Meteor.status
});

Template.header.events({
  "click .refresh": function (e) {
    e.preventDefault();
    console.log("Check mail start...");
    if(!Meteor.userId()){
      console.error("Not yet logged in.");
      return;
    } else {
      Meteor.call('check_mail', function (){});
    }
  },
  "click .portals-filter": function (e, tmpl) {
    e.preventDefault();
    $('#portalTable > .filter-bar').toggleClass('hidden');
    tmpl.$('.portals-filter').toggleClass('active');
  },
  'click .drawer-toggle': function(e) {
    e.preventDefault();
    $('.sidebar-nav-drawer').drawer('toggle', 150);
  }
});
