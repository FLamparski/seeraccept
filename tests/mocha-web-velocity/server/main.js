if(!(typeof MochaWeb === 'undefined')){

var assert = chai.assert;

describe("MailProcessor", function(){
    describe("Submission only", function(){
        it("should create an entry for portal submission", function(){
            var spoofedObject = { 
                submitted: [
                    {
                        subject: "Ingress Portal Submitted: Test",
                        date: new Date("2012-07-14T01:00:00+01:00"),
                        html: '<img src="test.jpg" />'
                    }
                ],
                live: [], rejected: []
            };
            MailProcessor.process("TEST_USER", spoofedObject);
            var portals = Portals.find({submitter: "TEST_USER"});
            assert.equal(portals.count(),
                1, 'one portal here');
            var thePortal = portals.fetch()[0];
            assert.equal(thePortal.name,
                'Test', 'correct name');
            assert.equal(thePortal.image,
                'test.jpg', 'correct image');
            assert.equal(thePortal.history.length,
                1, 'one event');
            assert.equal(thePortal.history[0].what, 'submitted');
            assert.equal(thePortal.history[0].timestamp.getTime(),
                new Date("2012-07-14T01:00:00+01:00").getTime(),
                'correct date');
        });

        after(function(){
            Portals.remove({submitter: "TEST_USER"});
        });
    });

    describe("Reviewed submissions", function(){
        beforeEach(function(){
            Portals.insert({
                name: "Test",
                image: "test.png",
                submitter: "TEST_USER",
                history: [{
                    timestamp: new Date("2014-04-01T15:38:03Z"),
                    what: 'submitted'
                }]
            });
        });

        afterEach(function(){
            Portals.remove({submitter: "TEST_USER"});
        });

        it("should add a go-live event", function(){
            var spoofedObject = {
                live: [
                    {
                        subject: "Ingress Portal Live: Test",
                        date: new Date("2012-07-14T01:00:00+01:00"),
                        html: '<img src="test.jpg" />'
                    }],
                submitted: [], rejected: []
            };
            MailProcessor.process('TEST_USER', spoofedObject);
            var thePortal = Portals.findOne({name: 'Test'});
            assert.equal(thePortal.history.length, 2,
                'Correct length of history');
            var evts = _.pluck(thePortal.history, 'what');
            assert.include(evts, 'live', 'Events include "live"');
        });

        it("should add a rejected event", function(){
            var spoofedObject = {
                rejected: [
                    {
                        subject: "Ingress Portal Rejected: Test",
                        date: new Date("2012-07-14T01:00:00+01:00"),
                        html: '<img src="test.jpg" />'
                    }],
                submitted: [], live: []
            };
            MailProcessor.process('TEST_USER', spoofedObject);
            var thePortal = Portals.findOne({name: 'Test'});
            assert.equal(thePortal.history.length, 2,
                'Correct length of history');
            var evts = _.pluck(thePortal.history, 'what');
            assert.include(evts, 'rejected', 'Events include "live"');
        });
    });

});

}

