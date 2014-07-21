MailProcessor = {};
var cheerio = Meteor.require('cheerio');

MailProcessor.process = function(userId, mail){
    /*
     * Mail comes in 3 types: submitted, rejected, and live.
     * First, we process the submitted portals to get the general
     * idea of what portals there are. Then we process the
     * live portals and the rejects for complete portal history.
     * Portals are matched by title.
     */
    console.log('Processing ' + mail.submitted.length + ' submissions');
    mail.submitted.map(function(msg){
        return {
            'submitter': userId,
            'name': msg.subject.slice(26), //skips "Ingress Portal Submitted: "
            'image': cheerio.load(msg.html)('img').attr('src'),
            'date': msg.date
        };
    }).forEach(function(obj){
        if(Portals.find({'$and': [{'name': obj.name},
            {'submitter': obj.submitter}]}).count() === 0){
            var model = _.pick(obj, 'submitter', 'name', 'image');
            model.history = [{
                timestamp: obj.date,
                what: 'submitted'
            }];
            console.log(model);
            Portals.insert(model);
        }
    });
    mail.live.map(function(msg){
        var $ = cheerio.load(msg.html);
        return {
            'submitter': userId,
            'title': msg.subject.slice(21), //skips "Ingress Portal Live: "
            'imageUrl': $('img').attr('src'),
            'intel': $('a[href*="ingress.com/intel"]').attr('href'),
            'date': msg.date
        };
    }).map(function(obj){
        var updoc = { $addToSet: { 'history': { 'timestamp': obj.date, 'what': 'live' }} };
        if (!(_.isUndefined(obj.intel))){
            updoc = _.extend(updoc, {$set: {intel: obj.intel}});
        }
        Portals.update(
            {$and: [{'name': new RegExp('^' + obj.title + '$', 'i')}, {'submitter': obj.submitter}]},
            updoc
        );
    });
    mail.rejected.map(function(msg){
        return {
            'submitter': userId,
            'title': msg.subject.slice(25), //skips "Ingress Portal Rejected: "
            'imageUrl': cheerio.load(msg.html)('img').attr('src'),
            'date': msg.date
        };
    }).map(function(obj){
        Portals.update(
            {$and: [{'name': new RegExp('^' + obj.title + '$', 'i')}, {'submitter': obj.submitter}]},
            {
            $addToSet: { 'history': { 'timestamp': obj.date, 'what': 'rejected' }}
            }
        );
    });
};
