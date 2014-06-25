var Imap = Meteor.require('imap'),
    myImap,
    imapState = {'s': 'not-yet', 'l': 'not-yet', 'r': 'not-yet'};

// Since we are checking several searches pretty much simultaneously, we need to
// keep track of when the three operations finish, and only then close the IMAP connection.
// it's not the most complex flag ever, but it's getting there.
function yield_imap (symbol) {
    imapState[symbol] = 'yield';
    if(imapState.s === 'yield' && imapState.l === 'yield' && imapState.r === 'yield'){
        myImap.end();
    }
}

function makexoauth2 (userId){
    var user = Meteor.users.findOne({'_id:': userId}),
        email = user.services.google.email,
        accessToken = user.services.accessToken;
    return new Buffer("user=" + email + "\001auth=Bearer " + accessToken + "\001\001").toString('base64');
}

function readycb (){
    console.log("GMail ready. Proceeding to search for NIA mail.");
    myImap.openBox('INBOX', true, function(err, box){
        if (err) throw err;
        var psubs = imap.search(['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Submitted"'],
            function(err, results){
                if (err) throw err;
                var f = imap.fetch(results, { bodies: '' });
                f.on('message', handle_submission_message);
                f.once('error', function(err){
                    console.error('Fetch error: ' + err);
                    yield_imap('s');
                });
                f.once('end', function(){
                    console.log('Done fetching submissions.');
                    yield_imap('s');
                });
            });
        var plive = imap.search(['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Live"'],
            function(err, results){
                if (err) throw err;
                var f = imap.fetch(results, { bodies: '' });
                f.on('message', handle_live_message);
                f.once('error', function(err){
                    console.error('Fetch error: ' + err);
                    yield_imap('l');
                });
                f.once('end', function(){
                    console.log('Done fetching live portals.');
                    yield_imap('l');
                });
            });
        var prejected = imap.search(['X-GM-RAW', 'from:ingress-support@google.com "Ingress Portal Rejected"'],
            function(err, results){
                if (err) throw err;
                var f = imap.fetch(results, { bodies: '' });
                f.on('message', handle_rejected_message);
                f.once('error', function(err){
                    console.error('Fetch error: ' + err);
                    yield_imap('r');
                });
                f.once('end', function(){
                    console.log('Done fetching rejections.');
                    yield_imap('r');
                });
            });
    });
}

Meteor.methods({
    check_mail: function(){
        if(this.userId){
            this.unblock(); // this is mostly a call-backy thingy
            myImap = new Imap({
                user: Meteor.users.findOne({'_id': this.userId}).services.google.email,
                xoauth2: makexoauth2(userId),
                host: 'imap.google.com',
                port: 993,
                tls: true
            });
            myImap.once('ready', readycb);
            myImap.once('error', errorcb);
            myImap.once('end', endcb);
            myImap.connect();
        } else {
            throw "No user ID provided!";
        }
    }
});
