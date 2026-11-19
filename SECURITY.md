# Security policy

qr-bill builds and reads payment slips. A flaw can send money to the wrong account or let a forged bill pass validation, so security reports are welcome and handled first.

## Supported versions

Security fixes are released for the latest minor version of each package. Before 1.0.0, upgrade to the latest version to receive them.

## Reporting a vulnerability

**Do not open a public issue.** Report the vulnerability privately through GitHub: [Report a vulnerability](https://github.com/qr-bill/qr-bill/security/advisories/new) (Security tab of the repository).

Please include:

- the package and its version;
- the input that triggers the problem, with fictional data only;
- what happens, what should happen, and the chapter of the SIX Implementation Guidelines when a rule of the standard is involved.

## What to expect

- An acknowledgement within 5 working days.
- An assessment within 10 working days and, if the vulnerability is confirmed, a plan for the fix.
- A coordinated disclosure: the fix is released first, then a security advisory is published, crediting you unless you prefer otherwise.

## Scope

Among others:

- a bill that `validateQRBill` or `createQRBill` accepts although it breaks a rule of the standard in a way that changes the payment (account, amount, currency, reference);
- a Swiss QR Code content that `parseQRBill` reads as something else than what it contains;
- an input that makes a function hang or use excessive time or memory, such as a regular expression with catastrophic backtracking;
- a problem in the build or the release process that could let a modified package reach users.
