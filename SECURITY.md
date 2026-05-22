# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✓         |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities by emailing **contact.kaptur@proton.me** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (extension version, browser, OS)
- Any proof-of-concept or screenshots if applicable

You will receive an acknowledgement within **48 hours** and a resolution update within **7 days**.

## Scope

In scope:

- Data leakage from IndexedDB (captures, media, annotations)
- Content script injection or privilege escalation
- Bypass of the extension's permission model
- Export/import path traversal or zip-slip vulnerabilities

Out of scope:

- Vulnerabilities in third-party websites captured by the extension
- Browser bugs unrelated to the extension itself
- Issues requiring physical access to the device

## Disclosure

Once a fix is released, the vulnerability will be disclosed in the [CHANGELOG](./CHANGELOG.md) under a `Security` section, crediting the reporter unless anonymity is requested.
