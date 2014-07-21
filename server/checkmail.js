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

function handle_search_results(type, results, imap, callback){
    var f;
    try {
      f = imap.fetch(results, { bodies: '' });
    } catch (e) {
      if(e.message === 'Nothing to fetch'){
        callback(null, []);
      } else {
        callback(e, null);
      }
    }
    var result = [];
    f.on('message', function(message, seqno){
        var parser = new MailParser();
        parser.on('end', function(mail){
            result.push(mail);
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
            //console.log('Processed seq# ' + seqno);
        });
    });
    f.once('error', function(err){
        if(yield_imap(type[0])) imap.end();
        callback(err, null);
    });
    f.once('end', function(){
        console.log('Done fetching messages for ' + type + '.');
        if(yield_imap(type[0])) imap.end();
        callback(null, result);
    });
}

function handle_check_mail(user, token, callback){
    var mail = {};
    myImap = new Imap({
        user: user.services.google.email,
        xoauth2: token,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        //debug: console.log
    });
    var onAllMailBoxFound = function(boxname, callback){
        myImap.openBox(boxname, true, function(err, box){
        if (err) callback(err, null);
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Submitted"']],
            function(err, results){
                if (err) callback(err, null);
                handle_search_results('submitted', results, myImap, function(err, result){
                    if (err) callback(err, null);
                    mail.submitted = result;
                });
            }); // psubs handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Live"']],
            function(err, results){
                if (err) callback(err, null);
                handle_search_results('live', results, myImap, function(err, result){
                    if (err) callback(err, null);
                    mail.live = result;
                });
            }); // plive handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Rejected"']],
            function(err, results){
                if (err) callback(err, null);
                handle_search_results('rejected', results, myImap, function(err, result){
                    if (err) callback(err, null);
                    mail.rejected = result;
                });
            }); // prejected handler
        }); // open box handler
    };
    myImap.once('ready', function() {
        console.log("Connection ready. Looking for boxes.");
        myImap.getBoxes(function(err, boxes){
          // Search for [Gmail] or [Google Mail]
          if (_.keys(boxes).indexOf('[Gmail]') !== -1){
            onAllMailBoxFound('[Gmail]/' + _.keys(boxes['[Gmail]'].children)[0]); // all mail is #1
          } else if (_.keys(boxes).indexOf('[Google Mail]') !== -1){
            onAllMailBoxFound('[Google Mail]' + _.keys(boxes['[Google Mail]'].children)[0]);
          } else {
            var e = new Error('Could not find GMail root.');
            e.boxes = boxes;
            callback(e, null);
          }
        });
    }); // once ready handler
    myImap.once('error', function(error){
        console.error(inspect(error));
        callback(error, null);
    }); // once error handler
    myImap.once('end', function(){
        console.log("Disconnected from Gmail.");
        callback(null, mail);
    });
    myImap.connect();
}

Meteor.methods({
    check_mail: function(){
            alert_user(Meteor.userId(), 'info', 'Starting Gmail pull, hang on...');
            var Future = Meteor.require('fibers/future');
            var future = new Future();
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
                    future.throw(err);
                }
                handle_check_mail(user, token, function(err, mail){
                    if(err){
                        future.throw(err);
                    } else {
                        future.return(mail);
                    }
                });
            }); // getToken
            try {
                var mail = future.wait();
                var total = mail.submitted.length + mail.live.length + mail.rejected.length;
                alert_user(Meteor.userId(), 'success', 'Fetched ' + total + ' messages. ' 
                        + mail.submitted.length + ' submissions, '
                        + mail.live.length + ' live, '
                        + mail.rejected.length + ' rejected. Processing data.');
                MailProcessor.process(Meteor.userId(), mail);
            } catch (e) {
                alert_user(Meteor.userId(), 'warning', 'Error fetching messages: ' + e.toString());
            }
        } // check_mail
});

