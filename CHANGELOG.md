# Changelog

## 1.0.1 (2026-10-27)

No changes to the SDK's code.

### Changed
- The SBOM on the GitHub Release lists every runtime package, including `debug`, `ms` and `function-bind`, and names its root component `@spreedly/composer-sdk-client`.
- The README's script tag example pins 1.0.1.

## 1.0.0 (2026-10-23)

First release as `@spreedly/composer-sdk-client`. If you're upgrading from `@dodgeball/trust-sdk-client`, read **Changed**, **Deprecated** and **Removed**.

### Added
- `Composer`, `useComposer`, `ComposerApiVersion` and the `IComposerConfig` type are exported from the package root, and the script-tag build sets `window.Composer`.
- The script-tag build also sets `window.SpreedlyComposer`, which holds every export (`SpreedlyComposer.Composer` and so on).

### Changed
- The package is now `@spreedly/composer-sdk-client`. Update your imports, and for script tags use `https://unpkg.com/@spreedly/composer-sdk-client@<version>/dist/umd/index.js` with a pinned version.
- The license is Apache-2.0.
- The main class is `Composer` and the React hook is `useComposer`. `Dodgeball`, `useDodgeball`, `DodgeballApiVersion` and `IDodgeballConfig` are still exported as deprecated aliases, and `window.Dodgeball` is still set.
- `useComposer` keeps its instance on `window.composer` (was `window.dodgeball`).
- `IComposerConfig.apiVersion` is optional (it defaults to `v1`), and `logLevel` also accepts the strings `"TRACE"`, `"INFO"`, `"ERROR"` and `"NONE"`.
- Error messages start with `Composer SDK Error` and log lines with `Composer SDK:`. Update any code that matches on this text.
- Requires Chrome 85, Edge 85, Firefox 79 or Safari 14 or later.
- The SDK includes RequireJS 2.3.8, which it uses to load integrations, instead of downloading RequireJS 2.3.6 from requirejs.org. If your Content Security Policy allows requirejs.org only for the SDK, you can remove it.
- The `_db_s` session cookie is set with `Secure` and `SameSite=Lax`, so the SDK's session only persists on pages served over HTTPS. Set `disableCookies` to keep it in `localStorage` instead.

### Deprecated
- The `enableCrossDomainSession` option. Current versions of Chrome, Firefox and Safari keep a third-party iframe's storage separate for each site, so it no longer shares a session between sites. It still works as before when set, and will be removed in a future major version. Turning it off moves the SDK's session ID from the iframe to the `_db_s` cookie, so a session stored in the iframe isn't carried over.

### Removed
- The `window.exampleTypescriptPackage` global. Use `window.SpreedlyComposer` or `window.Composer`.

### Fixed
- Clearing the session removes the `_db_s` session cookie.
- The SDK finishes starting up when no integrations load, and skips an integration whose script doesn't register itself, logging an error.
- The SDK skips an integration whose setup throws, logging an error, and loads the rest.
- With a `script[data-composer]` tag, the SDK finishes starting up when that script loaded before the SDK did, or failed to load.
- If a Content Security Policy or Trusted Types enforcement blocks the SDK's inline scripts, the SDK logs an error and finishes starting up without integrations. See [Content Security Policy](README.md#content-security-policy) for the policy the SDK needs.
