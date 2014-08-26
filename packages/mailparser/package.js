Package.describe({
  name: "mailparser",
  summary: "node-mailparser."
});

Npm.depends({
  "mailparser": "0.4.4"
});

Package.on_use(function(api) {
  api.imply && api.imply('mailparser', ['server']);
  api.add_files(['mailparser.js'], 'server');
  api.export(['MailParser']);
});
