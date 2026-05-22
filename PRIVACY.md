# Privacy Policy

**Effective date :** 2026-05-16

Kaptur is designed with a single privacy guarantee : **your data never leaves
your browser.**

## No data collection

Kaptur does not collect, transmit, store, or share any data outside your
browser. Specifically :

- **No telemetry.** No usage analytics, crash reports, or feature flags are
  ever sent anywhere.
- **No accounts.** There is no sign-in, no remote profile, no cloud sync.
- **No third-party services.** No fonts, scripts, or assets are loaded from
  external CDNs.
- **No outbound HTTP request** is ever made by Kaptur to any remote host.

## What stays local

The following information is stored in your browser's IndexedDB under the
extension's isolated origin, on your local device only :

- Sessions (name, description, color, dates)
- Captures (image blob, raw image blob, thumbnail blob, hashes, metadata,
  annotation data, notes, tags)
- **HTML snapshot** of each captured page (`document.documentElement.outerHTML`
  at the moment of capture). This is a verbatim copy of the live DOM and may
  therefore contain tokens, form values, session-bound content, or other
  sensitive data present in the page at capture time. It is stored locally
  alongside the screenshot and never transmitted.
- Tags and settings (naming convention template)

You can export, import or delete this data at any time from the cockpit
(`/sessions` page → Export / Import buttons → `.kaptur` file).

Uninstalling the extension purges the IndexedDB origin associated with it.

## Permission justifications

| Permission          | Purpose                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `<all_urls>`        | Capture screenshots and HTML of the page **you** trigger a capture on.    |
| `tabs`, `activeTab` | Read the active tab URL, title, and viewport size for metadata.           |
| `scripting`         | Inject the region-selection overlay and read `documentElement.outerHTML`. |
| `storage`           | Remember which session is currently active across browser restarts.       |

## Contact

For questions or concerns about this policy, email
<contact.kaptur@proton.me> or open an issue at
<https://github.com/1d3fix/kaptur/issues>.
