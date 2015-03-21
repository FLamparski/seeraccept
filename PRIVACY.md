# Privacy on IPSUM ![Dated 23 March 2015](https://img.shields.io/badge/date-2015/03/21-blue.svg)

I will never retrieve any messages other than those relating to Ingress
portal submissions, and will never store any raw email data.
Once a submission-related email has been processed, the only trace will be its
message ID - and that is more for diagnostics than anything else. The only
information I am storing about you is your basic, public Google+ profile and
your email address (which I will never sell or otherwise knowingly and willingly
transfer to a third party).

I reserve the right to use Google Analytics to collect usage information
on ipsum.filipwieland.com, which should help me make IPSUM better (for as long
as there is need for it), as well as the right to use your portal submission
data anonymously to produce aggregate reports on the general state of portal
submissions across all IPSUM users.

## Frequently asked questions

### What emails does IPSUM read?

IPSUM does not index, access or otherwise "read" any emails other than those
sent from ingress-support@google.com and bearing specific subject lines. If you
wish to review what IPSUM will access, try the following searches (if you use
multiple Google accounts you may need to select the one you use with Ingress):

* [from:ingress-support@google.com "Ingress Portal Submitted"](https://mail.google.com/mail/u/0/#search/from%3Aingress-support%40google.com+%22Ingress+Portal+Submitted%22)
* [from:ingress-support@google.com "Ingress Portal Live"](https://mail.google.com/mail/u/0/#search/from%3Aingress-support%40google.com+%22Ingress+Portal+Live%22)
* [from:ingress-support@google.com "Ingress Portal Rejected"](https://mail.google.com/mail/u/0/#search/from%3Aingress-support%40google.com+%22Ingress+Portal+Rejected%22)
* [from:ingress-support@google.com "Ingress Portal Duplicate"](https://mail.google.com/mail/u/0/#search/from%3Aingress-support%40google.com+%22Ingress+Portal+Duplicate%22)

### I am still hesitant.

If I haven't written IPSUM, I would be somewhat hesitant to use it too. The code
in master is the same as what is deployed on ipsum.filipwieland.com. If you wish,
you can create a new Gmail account and forward your submission-related emails
there. You can also download and run your own copy of IPSUM over which you will
have full control (see the [local quick-start guide](https://github.com/FLamparski/seeraccept/blob/master/README.md#local-quick-start-guide)).

### WTF insecure SSL?! (only on ipsum-test.filipwieland.com)

ipsum-test.filipwieland.com uses a self-signed certificate as I do not have the
resources to obtain a wildcard or multi-domain certificate. Until Let's Encrypt
comes around, this will continue to be the case. ipsum-test is an 'alpha channel'
and should be used only if you want to test out new features.

### Will IPSUM send emails from my account?

No. The reason I request full access is because of the IMAP front-end. I will be
looking into ways in which I can only request read-only access.
