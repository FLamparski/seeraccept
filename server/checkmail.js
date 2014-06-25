var Imap = Meteor.require('imap'),
    inspect = Meteor.require('util').inspect,
    xoauth2 = Meteor.require('xoauth2'),
    MailParser = Meteor.require('mailparser').MailParser,
    imapState = {'s': 'not-yet', 'l': 'not-yet', 'r': 'not-yet'};

// Since we are checking several searches pretty much simultaneously, we need to
// keep track of when the three operations finish, and only then close the IMAP connection.
// it's not the most complex flag ever, but it's getting there.
function yield_imap (symbol) {
    imapState[symbol] = 'yield';
    return (imapState.s === 'yield' && imapState.l === 'yield' && imapState.r === 'yield');
}

function handle_submission_message (msg, seq_n){
    msg.on('body', function(stream, info){
        console.log(info.which + " => " + info.size);
    });
    msg.once('attributes', function(attrs){
        console.log(inspect(attrs, false, 0));
    });
}

function handle_check_mail(user, token){
    myImap = new Imap({
        user: user.services.google.email,
        xoauth2: token,
        host: 'imap.gmail.com',
        port: 993,
        tls: true
    });
    myImap.once('ready', function() {
        console.log("GMail ready. Proceeding to search for NIA mail.");
        myImap.openBox('INBOX', true, function(err, box){
        if (err) throw err;
        var psubs = myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Submitted"']],
            function(err, results){
                if (err) throw err;
                var f = myImap.fetch(results, { bodies: '' });
                f.on('message', handle_submission_message);
                f.once('error', function(err){
                    console.error('Fetch error: ' + err);
                    if(yield_imap('s')) myImap.end();
                });
                f.once('end', function(){
                    console.log('Done fetching submissions.');
                    if(yield_imap('s')) myImap.end();
                });
            }); // psubs handler
        var plive = myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Live"']],
            function(err, results){
                if (err) throw err;
                var f = myImap.fetch(results, { bodies: '' });
                f.on('message', handle_submission_message);
                f.once('error', function(err){
                    console.error('Fetch error: ' + err);
                    if(yield_imap('l')) myImap.end();
                });
                f.once('end', function(){
                    console.log('Done fetching live portals.');
                    if(yield_imap('l')) myImap.end();
                });
            }); // plive handler
        var prejected = myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Rejected"']],
            function(err, results){
                if (err) throw err;
                var f = myImap.fetch(results, { bodies: '' });
                f.on('message', handle_submission_message);
                f.once('error', function(err){
                    console.error('Fetch error: ' + err);
                    if(yield_imap('r')) myImap.end();
                });
                f.once('end', function(){
                    console.log('Done fetching rejections.');
                    if(yield_imap('r')) myImap.end();
                });
            }); // prejected handler
        }); // open box handler
    }); // once ready handler
    myImap.once('error', function(error){
        console.error(inspect(error));
    }); // once error handler
    myImap.once('end', function(){ console.log("Disconnected from Gmail."); });
    myImap.connect();
}

Meteor.methods({
    check_mail: function(){
            this.unblock(); // this is mostly a call-backy thingy
            var user = Meteor.user(),
                keys = Accounts.loginServiceConfiguration.findOne({'service': 'google'});
                xoauth2obj = xoauth2.createXOAuth2Generator({
                    user: user.services.google.email,
                    clientId: keys.clientId,
                    clientSecret: keys.secret,
                    refreshToken: user.services.google.refreshToken
                });
            xoauth2obj.getToken(function(err, token){
                if(err) throw err;
                handle_check_mail(user, token);
            }); // getToken
        } // check_mail
});
