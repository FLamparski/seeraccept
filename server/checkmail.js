var Imap = Meteor.require('imap'),
    inspect = Meteor.require('util').inspect,
    xoauth2 = Meteor.require('xoauth2'),
    MailParser = Meteor.require('mailparser').MailParser,
    fs = Meteor.require('fs'),
    imapState = {'s': 'not-yet', 'l': 'not-yet', 'r': 'not-yet'};

// Since we are checking several searches pretty much simultaneously, we need to
// keep track of when the three operations finish, and only then close the IMAP connection.
// it's not the most complex flag ever, but it's getting there.
function yield_imap (symbol) {
    imapState[symbol] = 'yield';
    return (imapState.s === 'yield' && imapState.l === 'yield' && imapState.r === 'yield');
}

function alert_user (uid, atype, atext){
    Alerts.remove({'uid': uid});
    Alerts.insert({'uid': uid, 'atype': atype, 'atext': atext});
}

function handle_one_message(type, mail, seqno){
    fs.createWriteStream('/home/filip/seeraccept_test/' + type + '-' + seqno + '.txt').write(mail.html);
}

function handle_search_results(type, results, imap){
    var f = imap.fetch(results, { bodies: '' });
    f.on('message', function(message, seqno){
        var parser = new MailParser();
        parser.on('end', function(mail){
            handle_one_message(type, mail, seqno);
        });
        message.on('body', function(stream, info){
            stream.on('data', function(chunk){
                parser.write(chunk);
            });
            stream.on('end', function(){
                parser.end();
            });
        });
        message.on('end', function (){
            console.log('Processed seq# ' + seqno);
        });
    });
    f.once('error', function(err){
        console.error('Fetch error: ' + err);
        if(yield_imap(type[0])) imap.end();
    });
    f.once('end', function(){
        console.log('Done fetching messages for ' + type + '.');
        if(yield_imap(type[0])) imap.end();
    });
}

function handle_check_mail(user, token, callback){
    myImap = new Imap({
        user: user.services.google.email,
        xoauth2: token,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        //debug: console.log
    });
    myImap.once('ready', function() {
        console.log("GMail ready. Proceeding to search for NIA mail.");
        myImap.openBox('INBOX', true, function(err, box){
        if (err) throw err;
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Submitted"']],
            function(err, results){
                if (err) throw err;
                handle_search_results('submitted', results, myImap);
            }); // psubs handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Live"']],
            function(err, results){
                if (err) throw err;
                handle_search_results('live', results, myImap);
            }); // plive handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Rejected"']],
            function(err, results){
                if (err) throw err;
                handle_search_results('rejected', results, myImap);
            }); // prejected handler
        }); // open box handler
    }); // once ready handler
    myImap.once('error', function(error){
        console.error(inspect(error));
        callback(error);
    }); // once error handler
    myImap.once('end', function(){
        console.log("Disconnected from Gmail.");
        callback();
    });
    myImap.connect();
}

Meteor.methods({
    check_mail: function(){
            Alerts.insert({atype: 'info', atext: 'IMAP pull initiated. Stand by.', uid: Meteor.userId()});
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
                if(err) {
                    alert_user(Meteor.userId(), 'warning',
                        'Error generating authentication data for Gmail.');
                    console.error(err);
                }
                handle_check_mail(user, token, function(err){
                    if(err){
                        alert_user(user._id, 'warning', "Error checking Gmail");
                    } else {
                        alert_user(user._id, 'success', "Email fetched.");
                    }
                });
            }); // getToken
        } // check_mail
});

