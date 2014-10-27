Package.describe({
  name: "cheerio",
  summary: "node-cheerio."
});

Npm.depends({
  "cheerio": "0.12.3"
});

Package.on_use(function(api) {
  api.add_files(['cheerio.js'], 'server');
  api.export(['cheerio']);
});
