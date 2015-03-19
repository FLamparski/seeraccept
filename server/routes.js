/* eslint-env node */
/* global Router, Assets, Logger, Meteor */

var fs = Meteor.npmRequire('fs');

Router.route('/image-missing/:title', {where: 'server'})
  .get(function() {
    Logger.log('/image-missing', this.params.title);
    fs.readFile('assets/app/image-missing.svg', function(err, buffer) {
      if (err) {
        Logger.error('/image-missing', err);
        this.response.writeHead(500, {'Content-Type': 'text/plain'});
        return this.response.end('Could not fetch the image');
      }

      this.response.writeHead(200, {'Content-Type': 'image/svg+xml'});
      this.response.end(buffer);
    }.bind(this));
  });
