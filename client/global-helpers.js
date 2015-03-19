/* global Template, Router, Meteor, moment */
/**
 * Cheap equality operator for Handlebars
 */
Template.registerHelper('eq', function(a, b) {
  return a === b;
});
Template.registerHelper('gt', function(a, b) {
  return a > b;
});
/**
 * Lowercase of str for use in templates
 */
Template.registerHelper('downcase', function(str) {
  return str && str.toLowerCase();
});
/**
 * Sentence case: capitalise the first letter
 */
Template.registerHelper('sentenceCase', function(str) {
  return str && str[0].toUpperCase() + str.slice(1);
});
/**
 * Returns 'active' if the route @route is the current
 * route. The Fragment version does a regexp for a
 * more fuzzy match.
 */
Template.registerHelper('activeFor', function(route) {
  return (Router.current().url === '/' + route) ? 'active' : '';
});
Template.registerHelper('activeForFragment', function(routeFragment) {
  if (new RegExp(routeFragment, 'i').test(Router.current().url)) {
    return 'active';
  } else {
    return '';
  }
});
/**
 * Generate a CSS class for the current route.
 * Does it by removing the leading slash, and
 * then substituting trailing slashes with spaces,
 * so routes like /portals/me become
 * CSS classes 'portals me'.
 */
Template.registerHelper('routeClass', function() {
  return Router.current().url.replace(Meteor.absoluteUrl(), '').replace('/', ' ');
});

Template.registerHelper('fromNow', function(date) {
  return moment(date).fromNow();
});
Template.registerHelper('dateToISO', function(date) {
  return moment(date).format();
});
