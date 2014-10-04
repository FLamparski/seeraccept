var cheerio = Meteor.npmRequire('cheerio');
var inspect = Meteor.npmRequire('util').inspect;
MailProcessor = function (userId) {
  this.userId = userId;
};

MailProcessor.prototype._doOneSubmission = function (submission) {
  var mailDoc = cheerio.load(submission.html);
  var img_src = mailDoc('img').attr('src');
  if (!img_src) {
    console.warn('Portal %s cannot be tracked - no image', submission.subject);
    return false;
  }
  if (Submissions.find({image_url: img_src}).count() > 0) {
    return false;
  }
  var submissionModel = {
    submitter: this.userId,
    image_url: img_src,
    submission_date: submission.date,
    history: [{
      message_id: submission.messageId,
      timestamp: submission.date,
      what: 'submitted',
      title: submission.subject.slice(26) // "Ingress Portal Submitted: ".length === 26
    }]
  };
  var subId = Submissions.insert(submissionModel);
  var portalModel = {
    owner: this.userId,
    title: submissionModel.history[0].title,
    image_url: submissionModel.image_url,
    created_at: new Date(),
    submissions: [ subId ]
  };
  Portals.insert(portalModel);
  return true;
};
MailProcessor.prototype.processSubmissions = function (submissions) {
  console.log('  processing submissions...');
  var self = this;
  submissions.map(function (submission) {
    return self._doOneSubmission(submission);
  });
  console.log('  ...done');
  return _.compact(submissions).length;
};

MailProcessor.prototype._isAlreadyProcessed = function (submission, message_id) {
  return submission && _.some(submission.history, function (event) {
    return event.message_id === message_id;
  });
};

MailProcessor.prototype._doOneRejection = function (rejection) {
  var mailDoc = cheerio.load(rejection.html);
  var img_src = mailDoc('img').attr('src');
  var theSubmission = Submissions.findOne({image_url: img_src});
  if (!theSubmission) {
    console.error('cannot find the submission. are you sure you have the email?');
    console.log(rejection);
    return false;
  }
  if (this._isAlreadyProcessed(theSubmission, rejection.messageId)) {
    return false;
  }
  // Rejection emails start with a sentence saying something like "thanks for submitting"
  // and then follow with another sentence with a reason. So far, I have:
  // EITHER
  // However, this Portal candidate does not meet the criteria required for approval.
  // OR
  // Unfortunately, this Portal is too close to another existing Portal to be safely hacked and cannot be enabled at this time.
  // Code below just skips the first sentence and then tries to remove the howevers.
  // "NLP", yeah right.
  var reason = mailDoc('p').first().text().split('.')[1].replace(/^\s/, '');
  if (reason.indexOf('However') === 0) {
    reason = reason.slice('However, '.length);
    reason[0] = reason[0].toUpperCase();
  } else if (reason.indexOf('Unfortunately') === 0) {
    reason = reason.slice('Unfortunately, '.length);
    reason[0] = reason[0].toUpperCase();
  }
  reason += '.';
  var eventModel = {
    message_id: rejection.messageId,
    what: 'rejected',
    timestamp: rejection.date,
    title: rejection.subject.slice(25), // "Ingress Portal Rejected: ".length === 25
    description: reason
  };
  Submissions.update(theSubmission._id, {$push: {history: eventModel}});
  return true;
};
MailProcessor.prototype.processRejections = function (rejections) {
  var self = this;
  console.log('  processing rejections...');
  rejections.map(function (rejections) {
    return self._doOneRejection(rejections);
  });
  console.log('  ...done');
  return _.compact(rejections).length;
};

MailProcessor.prototype._doOneDuplicate = function (duplicate) {
  var mailDoc = cheerio.load(duplicate.html);
  var img_src = mailDoc('img').attr('src');
  var theSubmission = Submissions.findOne({image_url: img_src});
  if (this._isAlreadyProcessed(theSubmission, duplicate.messageId)) {
    return false;
  }
  var eventModel = {
    message_id: duplicate.messageId,
    what: 'duplicate',
    timestamp: duplicate.date,
    title: duplicate.subject.slice(26), // "Ingress Portal Duplicate: ".length === 26
  };
  Submissions.update(theSubmission._id, {$push: {history: eventModel}});
  return true;
};
MailProcessor.prototype.processDuplicates = function (duplicates) {
  var self = this;
  console.log('  processing duplicates...');
  duplicates.map(function (duplicate) {
    return self._doOneDuplicate(duplicate);
  });
  console.log('  ...done');
  return _.compact(duplicates).length;
};

MailProcessor.prototype._doOneLive = function (live) {
  var mailDoc = cheerio.load(live.html);
  var img_src = mailDoc('img').attr('src');
  var theSubmission = Submissions.findOne({image_url: img_src});
  if (this._isAlreadyProcessed(theSubmission, live.messageId)) {
    return false;
  }
  var eventModel = {
    message_id: live.messageId,
    what: 'live',
    timestamp: live.date,
    title: live.subject.slice(21), // "Ingress Portal Duplicate: ".length === 26
    description: mailDoc('img + p').text()
  };
  Submissions.update(theSubmission._id, {
    $push: {history: eventModel},
    $set: {intel_url: mailDoc('a[href*="ingress.com/intel"]').attr('href')}
  });
  return true;
};
MailProcessor.prototype.processLives = function (lives) {
  var self = this;
  console.log('  processing live...');
  lives.map(function (live) {
    return self._doOneLive(live);
  });
  console.log('  ...done');
  return _.compact(lives).length;
};

MailProcessor.process = function (userId, mail) {
  check(userId, String);
  console.log('Processing submissions for %s', userId);
  var mp = new MailProcessor(userId);
  var newSubs = mp.processSubmissions(mail.submitted);
  var newDups = mp.processDuplicates(mail.duplicates);
  var newRejs = mp.processRejections(mail.rejected);
  var newLivs = mp.processLives(mail.live);
  Logs.insert({
    user: userId,
    timestamp: new Date(),
    what: 'mailprocessor',
    new_submissions: newSubs,
    new_duplicates: newDups,
    new_rejections: newRejs,
    new_lives: newLivs
  });
};
