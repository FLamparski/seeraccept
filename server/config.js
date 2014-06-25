Meteor.startup(function (){

Accounts.loginServiceConfiguration.remove({
    service: "google"
});

Accounts.loginServiceConfiguration.insert({
    service: "google",
    clientId: "1057655435719-8ppm28piefjlds4cech42ipsupkl21no.apps.googleusercontent.com",
    secret: "yTDUEtbyjOfEEMUr4i09DA_X"
});

});
