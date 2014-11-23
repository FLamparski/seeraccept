/* global Template, Session, $ */

function getViewport() {
  return {
    width: $('html').width(),
    height: $('html').height()
  };
}

function updateViewport() {
  Session.set('viewport', getViewport());
}

$(window).on('resize', updateViewport);
$(function() { updateViewport(); });

Template.registerHelper('viewport', function() {
  return Session.get('viewport');
});
