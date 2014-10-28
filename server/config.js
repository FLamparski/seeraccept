Meteor.startup(function (){

  Accounts.loginServiceConfiguration.remove({
    service: "google"
  });

  Accounts.loginServiceConfiguration.insert({
    service: "google",
    clientId: Meteor.settings.clientId,
    secret: Meteor.settings.secret
  });

});

