/* global Accounts, Meteor, _, SyncedCron */

Accounts.onCreateUser(function (options, user) {
    var accessToken = user.services.google.accessToken,
        result,
        account_emails,
        profile;

    result = HTTP.get('https://www.googleapis.com/plus/v1/people/me', {
        params: {
            access_token: accessToken
        }
    });

    if(result.error){
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

    return user;
});

SyncedCron.add({
  name: 'Log out users with expired tokens',
  schedule: function (parser) {
    return parser.text('every 1 hour');
  },
  job: function () {
    Meteor.users.find({'services.google.expiresAt': {$lt: new Date()}})
      .map(function(user) {
        console.log('logging out', user._id, user.profile.nickname);
        Meteor.users.update(user._id, {
          $set: {'services.resume.loginTokens': []}
        });
      });
  }
});

Meteor.startup(function() {
  SyncedCron.start({
    utc: true
  });
});

Meteor.methods({
  refreshSession: function() {
    check(this.userId, String);
    var user = Meteor.users.findOne(this.userId);
    HTTP.post('https://accounts.google.com/o/oauth2/token', {
        params: {
          refresh_token: user.services.google.refreshToken,
          client_id: Meteor.settings.clientId,
          client_secret: Meteor.settings.secret,
          grant_type: 'refresh_token'
        }
    }, function (error, result) {
      if (error) {
        console.error(error);
      } else {
        Meteor.users.update(user._id, {
          $set: {
           'services.google.accessToken': result.data.access_token,
           'services.google.expiresAt': Date.now() + result.data.expires_in
          }
        });
      }
    });
  }
});
