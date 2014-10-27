var Imap = Meteor.npmRequire('imap'),
    xoauth2 = Meteor.npmRequire('xoauth2'),
    MailParser = Meteor.npmRequire('mailparser').MailParser,
    inspect = Meteor.npmRequire('util').inspect,
    fs = Meteor.npmRequire('fs'),
    imapState = {'s': 'not-yet', 'l': 'not-yet', 'r': 'not-yet', 'd': 'not-yet'};

// Since we are checking several searches pretty much simultaneously, we need to
// keep track of when the three operations finish, and only then close the IMAP connection.
// it's not the most complex flag ever, but it's getting there.
function yield_imap (symbol) {
    imapState[symbol] = 'yield';
    return (imapState.s === 'yield' && imapState.l === 'yield' && imapState.r === 'yield' && imapState.d === 'yield');
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
        return;
      } else {
        callback(e, null);
        return;
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
  console.log('handle_check_mail %s', user.services.google.email);
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
                if (err) return callback(err, null);
                handle_search_results('submitted', results, myImap, function(err, result){
                    if (err) {
                      callback(err, null);
                      return;
                    }
                    mail.submitted = result;
                });
            }); // psubs handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Live"']],
            function(err, results){
                if (err) return callback(err, null);
                handle_search_results('live', results, myImap, function(err, result){
                    if (err) {
                      callback(err, null);
                      return;
                    }
                    mail.live = result;
                });
            }); // plive handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Rejected"']],
            function(err, results){
                if (err) return callback(err, null);
                handle_search_results('rejected', results, myImap, function(err, result){
                    if (err) {
                      callback(err, null);
                      return;
                    }
                    mail.rejected = result;
                });
            }); // prejected handler
        myImap.search(['ALL', ['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Duplicate"']],
            function(err, results){
              if (err) return callback(err, null);
              handle_search_results('duplicate', results, myImap, function(err, result){
                  if (err) {
                    callback(err, null);
                    return;
                  }
                  mail.duplicates = result;
              });
            }); // pdupe handler
        }); // open box handler
    };
    myImap.once('ready', function() {
        console.log("Connection ready. Looking for boxes.");
        myImap.getBoxes(function(err, boxes){
          var allmail = null;
          function traverseBoxes(boxes){
            var keys = _.keys(boxes);
            var copied = _.each(keys, function(key){
              boxes[key]._name = key;
              if(boxes[key].children){
                boxes[key].children = traverseBoxes(boxes[key].children);
                console.log(key);
              }
              if(boxes[key].attribs.indexOf('\\All') >= 0){
                allmail = boxes[key];
              }
            });
            return boxes;
          }
          traverseBoxes(boxes);
          if(allmail === null){
            callback(new Error('Fatal: Could not locate an ALL box!'), null);
            return;
          }
          var allboxname = allmail.parent._name + allmail.parent.delimiter + allmail._name;
          console.log('==== Allmail is at ', allboxname);
          onAllMailBoxFound(allboxname, callback);
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
    try {
      myImap.connect();
    } catch (err) {
      console.log(inspect(err));
      callback(err);
    }
}

Meteor.methods({
  check_mail: function(){
    console.log('check_mail %s', Meteor.userId());
    alert_user(Meteor.userId(), 'notice', 'Starting Gmail pull, hang on...');
    this.unblock(); // this is mostly a call-backy thingy
    var user = Meteor.user(),
      keys = Accounts.loginServiceConfiguration.findOne({'service': 'google'});
      xoauth2obj = xoauth2.createXOAuth2Generator({
        accessToken: user.services.google.accessToken,
        user: user.services.google.email,
        clientId: keys.clientId,
        clientSecret: keys.secret,
        refreshToken: user.services.google.refreshToken
      });
    console.log("xoauth2 getToken %s", user.services.google.email);
    var token = Async.runSync(function(done){
      xoauth2obj.getToken(done);
    }); // getToken
    console.info(inspect(token.error, {depth: 4, colors: true}));
    var checkMail = Async.wrap(handle_check_mail);
    try {
      var mail = checkMail(user, token.result);
      var total = mail.submitted.length + mail.live.length + mail.rejected.length;
      alert_user(Meteor.userId(), 'notice', 'Fetched ' + total + ' messages. ' +
            mail.submitted.length + ' submissions, ' +
            mail.live.length + ' live, ' +
            mail.rejected.length + ' rejected. Processing data.');
      MailProcessor.process(Meteor.userId(), mail);
    } catch (e) {
      console.error(e.stack);
      alert_user(Meteor.userId(), 'error', 'Error fetching messages: ' + e.toString());
    }
  } // check_mail
});

