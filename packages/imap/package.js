Package.describe({
  name: "imap",
  summary: "node-imap."
});

Npm.depends({
  imap: '0.8.10'
});

Package.on_use(function(api) {
  api.add_files(['imap.js'], 'server');
  api.export(['Imap']);
});
