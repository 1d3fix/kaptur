import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Kaptur',
    short_name: 'Kaptur',
    description:
      'Capture, annotate and organize your OSINT investigations. 100% local, zero telemetry.',
    version: '1.0.0',

    homepage_url: 'https://github.com/1d3fix/kaptur',
    permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'downloads'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none';",
    },
    browser_specific_settings: {
      gecko: {
        id: 'kaptur@1d3fix.github.io',
        strict_min_version: '109.0',
      },
    },
  },
});
