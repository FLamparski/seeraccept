/* global portalLib:true */
portalLib = {};

portalLib.PORTAL_STATE_TABLE = {
  'live': 1,
  'manual_override': 2,
  'duplicate': 3,
  'rejected': 4,
  'submitted': 5
};

portalLib.sortByEventType = function (portalEvent) {
  return portalLib.PORTAL_STATE_TABLE[portalEvent.what] || 1000000;
};

portalLib.getSubmissionsForPortal = function getSubmissionsForPortal (portal) {
  return portal.history;
};

portalLib.portalWaitTimes = function portalWaitTimes (portals) {
  return portals.map(portalLib.getWaitTime);
};

portalLib.portalResponseTimes = function portalResponseTimes (portals) {
  return portalLib.portalWaitTimes(portals).filter(function (waitTime) {
    return waitTime.conclusive;
  }).map(function(waitTime) {
    return waitTime.days;
  });
};

portalLib.getWaitTime = function getTimeToReview (portal) {
  if (portal.history.length == 1) {
    return {
      days: moment().diff(moment(portal.history[0].timestamp), 'days'),
      conclusive: false
    };
  }
  var sortedHistory = _.sortBy(portal.history, 'timestamp');
  return {
    days: moment(_.last(sortedHistory).timestamp).diff(_.first(sortedHistory).timestamp, 'days'),
    conclusive: true
  };
};

portalLib.getPortalState = function getSubmissionState (submission) {
  return _.sortBy(submission.history, portalLib.sortByEventType)[0].what;
};

portalLib.countPortalsWhichAre = function countPortalsWhichAre (what, portals) {
  return portals.map(portalLib.getPortalState).filter(function (state) {
    return state === what;
  }).length;
};
