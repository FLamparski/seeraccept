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
  return Submissions.find({_id: {$in: portal.submissions}}).fetch();
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
  portal.submissions = portalLib.getSubmissionsForPortal(portal);
  var perSubmissionTimes = portal.submissions.map(function (submission){
    var history = _.sortBy(submission.history, 'timestamp');
    var startDate, endDate, responded;
    startDate = moment(history[0].timestamp);
    if (history.length > 1) {
      endDate = moment(_.last(history).timestamp);
      responded = true;
    } else {
      endDate = moment();
      responded = false;
    }
    return {
      days: moment.duration(endDate.diff(startDate)).asDays(),
      conclusive: responded
    };
  });
  if (perSubmissionTimes.length === 1) {
    console.log('single time route ? TTR for %s is %f', portal.title, perSubmissionTimes[0].days);
    return perSubmissionTimes[0];
  } else if (_.findWhere(perSubmissionTimes, { conclusive: true })) {
    console.log('multi submissions with conclusive results');
    var onlyConclusive = _.filter(perSubmissionTimes, function (pst) {
      return pst.conclusive;
    });
    return {
      conclusive: true,
      days: _.max(_.pluck(onlyConclusive, 'days'))
    };
  } else {
    console.log('multi submissions with inconclusive results');
    return {
      conclusive: false,
      days: _.max(_.pluck(perSubmissionTimes, 'days'))
    };
  }
};

portalLib.getSubmissionState = function getSubmissionState (submission) {
  return _.sortBy(submission.history, portalLib.sortByEventType)[0].what;
};

portalLib.getPortalState = function getPortalState (portal) {
    var allSubStates = portalLib.getSubmissionsForPortal(portal).map(function (submission) {
      return portalLib.getSubmissionState(submission);
    });
    var pstates = _.sortBy(allSubStates, function (state) { return portalLib.PORTAL_STATE_TABLE[state]; });
    return pstates[0];
};

portalLib.countPortalsWhichAre = function countPortalsWhichAre (what, portals) {
  return portals.map(portalLib.getPortalState).filter(function (state) {
    return state === what;
  }).length;
};
