var inspect = Meteor.require('util').inspect;

Accounts.onCreateUser(function (options, user) {
    var accessToken = user.services.google.accessToken,
        result,
        account_emails,
        profile;

    result = Meteor.http.get('https://www.googleapis.com/plus/v1/people/me', {
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

    account_emails = result.data.emails.filter(
            function(e) { return e.type === 'account'; }
            ).map(
            function(e) { return e.value; }
            );

    user.profile = profile;
    user.account_emails = account_emails;

    return user;
});

