/* global Accounts, Meteor, Alerts, check, HTTP, SyncedCron, doCheckMail, Logger, moment */

Accounts.onCreateUser(function(options, user) {
  Logger.log('onCreateUser', user._id);
  var accessToken = user.services.google.accessToken,
    result,
    account_emails,
    profile;

  result = HTTP.get('https://www.googleapis.com/plus/v1/people/me', {
    params: {
      access_token: accessToken
    }
  });

  if (result.error) {
    throw result.error;
  }

  profile = {
    nickname: result.data.displayName,
    avatar_url: result.data.image.url
  };

  account_emails = result.data.emails.filter(function(e) {
    return e.type === 'account';
  }).map(function(e) {
    return e.value;
  });

  user.profile = profile;
  user.account_emails = account_emails;

  Logger.log('onCreateUser', user._id, profile.nickname);
  return user;
});

Accounts.onLogin(function(loginInfo) {
  Logger.log('login', loginInfo.user.services.google.email, loginInfo.type);
});

function logoutExpired() {
  var query = {
    'services.google.expiresAt': {
      $lt: Date.now()
    }
  };
  // clear alerts for users being logged out
  Meteor.users.find(query).map(function(user) {
    Alerts.remove({
      uid: user._id
    });
  });
  return Meteor.users.update(query, {
    $set: {
      'services.resume.loginTokens': []
    }
  }, {
    multi: true
  });
}

SyncedCron.add({
  name: 'Log out users with expired tokens',
  schedule: function(parser) {
    return parser.text('every 45 minutes');
  },
  job: function() {
    var rowsAffected = logoutExpired();
    return 'Logged out ' + rowsAffected + ' user(s).';
  }
});

Meteor.startup(function() {
  SyncedCron.start({
    utc: true
  });
  var rowsAffected = logoutExpired();
  console.log('Cleaining old sessions: logged out', rowsAffected, 'users');
});

Meteor.methods({
  refreshSession: function() {
    check(this.userId, String);
    var user = Meteor.users.findOne(this.userId);
    Logger.log('refreshSession', user._id);
    HTTP.post('https://accounts.google.com/o/oauth2/token', {
      /* eslint-disable camelcase */
      params: {
        refresh_token: user.services.google.refreshToken,
        client_id: Meteor.settings.clientId,
        client_secret: Meteor.settings.secret,
        grant_type: 'refresh_token'
      }
      /* eslint-enable camelcase */
    }, function(error, result) {
      if (error) {
        Logger.error('refreshSession', user._id, error);
      } else {
        Logger.log('refreshSession', user._id, 'token expires', moment().add(result.data.expires_in, 'seconds').fromNow());
        var rowsAffected = Meteor.users.update(user._id, {
          $set: {
            'services.google.accessToken': result.data.access_token,
            'services.google.expiresAt': Date.now() + result.data.expires_in * 1000 // expiresAt is in ms, expires_in is in seconds.
          }
        });
        Logger.log('refreshSession', user._id, 'success');
      }
    });
  }
});
