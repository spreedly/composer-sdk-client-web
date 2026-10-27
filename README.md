# Spreedly Composer Client SDK for JavaScript

## Table of Contents

- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
- [Related](#related)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Migrating from @dodgeball/trust-sdk-client](#migrating-from-dodgeballtrust-sdk-client)
- [Development](#development)
- [License](#license)
- [Support](#support)

## Purpose

[Spreedly Composer](https://developer.spreedly.com) enables developers to decouple security logic from their application code. This has several benefits including:

- The ability to toggle and compare security services like fraud engines, MFA, KYC, and bot prevention.
- Faster responses to new attacks. When threats evolve and new vulnerabilities are identified, your application's security logic can be updated without changing a single line of code.
- The ability to put in placeholders for future security improvements while focusing on product development.
- A way to visualize all application security logic in one place.

The Composer Client SDK for JavaScript runs in your users' browsers. It identifies the device, runs any extra steps a workflow asks for (such as MFA), and gives you a source token to pass to your API. It is maintained by the Spreedly team.

## Prerequisites

- A public API key for your application from the [developer settings](https://app.dodgeballhq.com/developer) page.
- Chrome 85, Edge 85, Firefox 79, Safari 14 or later. Internet Explorer is not supported.

## Related

Your backend calls checkpoints with one of the [Composer server SDKs](https://developer.spreedly.com/docs/server-sdks-1#available-sdks), passing along the source token from this SDK.

[Composer examples](https://github.com/spreedly/composer-examples) has a runnable web client for this SDK in `client/web-next`, and example servers that it calls.

## Installation

Use `npm` to install the Composer module:

```sh
npm install @spreedly/composer-sdk-client
```

Alternatively, using `yarn`:

```sh
yarn add @spreedly/composer-sdk-client
```

## Usage

Create one `Composer` instance with your public API key when your application loads. Once you know the session, and later the user, pass them to `track()`:

```js
import { Composer } from "@spreedly/composer-sdk-client";

const composer = new Composer("public-api-key...");

// As soon as you have a session ID
composer.track(session.id);

// When the user logs in
composer.track(session.id, user.id);
```

When the user does something you want to protect, get a source token and send it to your API. Your API calls a checkpoint with it and returns the verification. Pass the verification to `handleVerification()`, which runs any extra steps the workflow needs and calls you back with the result:

```js
const placeOrder = async (order, previousVerificationId = null) => {
  const sourceToken = await composer.getSourceToken();

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dodgeball-source-token": sourceToken, // Pass the source token to your API
      ...(previousVerificationId && { "x-dodgeball-verification-id": previousVerificationId })
    },
    body: JSON.stringify({ order })
  });
  const body = await response.json();

  if (response.status === 200) {
    showOrderPlaced();
    return;
  }
  if (!body.verification) {
    showError("Something went wrong. Please try again.");
    return;
  }

  composer.handleVerification(body.verification, {
    onVerified: async (verification) => {
      // If an additional check was performed and the request is approved, pass the verification ID to your API
      // Each verification ID can only be used once, to prevent replay attacks
      await placeOrder(order, verification.id);
    },
    onApproved: async () => {
      // If no additional check was required, update the view to show that the order was placed
      showOrderPlaced();
    },
    onDenied: async (verification) => {
      // If the action was denied, update the view to show the rejection
      showOrderDenied();
    },
    onError: async (error) => {
      // If there was an error performing the verification, display it
      // Usage note: if the user cancels the verification, error.errorType is "CANCELLED"
      // If error.errorType is "SYSTEM", the verification failed on the server (for example, a
      // third-party service was unavailable), so offering the user a retry can help
      showError(error.details);
    }
  });
};
```

The server SDK READMEs show the matching API side: it returns `200` when the order is placed, and the verification when the workflow denies the order or needs more from the user.

### React

`useComposer` creates the instance the first time it's called with your public API key, and returns the same instance everywhere after that:

```tsx
import { useComposer } from "@spreedly/composer-sdk-client";
import { useEffect } from "react";

export default function App({ session, user }) {
  const composer = useComposer("public-api-key...");

  useEffect(() => {
    composer.track(session?.id, user?.id);
  }, [session?.id, user?.id]);

  return <Checkout />;
}

function Checkout() {
  const composer = useComposer(); // Once initialized, you can omit the public API key
  // ...
}
```

### Loading with a script tag

The SDK is also available from unpkg. Pin the version so a new release can't change your page without you knowing, and copy the `integrity` value for that version from its [release notes](https://github.com/spreedly/composer-sdk-client-web/releases) so the browser won't run the file if it's ever changed. `crossorigin="anonymous"` is required for the browser to check it:

```html
<script src="https://unpkg.com/@spreedly/composer-sdk-client@1.0.1/dist/umd/index.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
<script>
  const composer = new Composer("public-api-key...");
</script>
```

The script sets `window.Composer`. It also sets `window.SpreedlyComposer`, which holds every export (`SpreedlyComposer.Composer`, `SpreedlyComposer.LogLevel` and so on), in case another script on your page already uses the name `Composer`.

### Content Security Policy

The SDK adds RequireJS and your workflow's integration code to the page as inline scripts. If your page sets a `Content-Security-Policy`, its `script-src` must allow them with either:

- a nonce on the script that loads the SDK, plus `'strict-dynamic'`, or
- `'unsafe-inline'`, plus any host your integrations load scripts from.

A `script-src` without `'strict-dynamic'` or `'unsafe-inline'` blocks them, as does Trusted Types enforcement (`require-trusted-types-for 'script'`), which the SDK doesn't support. In either case the SDK logs an error and finishes starting up without integrations.

`connect-src` must also allow your `apiUrl` (`https://api.dodgeballhq.com` by default). If you set the deprecated `enableCrossDomainSession` option, `frame-src` must allow it too.

## API

### Configuration

---

The constructor takes your public API key and an optional configuration object:

```js
const composer = new Composer("public-api-key...", {
  apiUrl: "https://api.dodgeballhq.com",
  logLevel: "ERROR"
});
```

| Option | Default | Description |
| --- | --- | --- |
| `apiVersion` | `v1` | The Composer API version to use. |
| `apiUrl` | `https://api.dodgeballhq.com/` | The base URL of the Spreedly Composer API. Useful for sending requests to different environments such as `https://api.sandbox.dodgeballhq.com`. |
| `logLevel` | `INFO` | `TRACE`, `INFO`, `ERROR` or `NONE`. `TRACE` and `INFO` are useful for debugging, `ERROR` only logs errors, and `NONE` turns off logging. |
| `disableCookies` | `false` | When `true`, the SDK keeps the source token in `localStorage` instead of a cookie. |
| `isEnabled` | `true` | When `false`, the SDK makes no API calls: `getSourceToken()` returns a placeholder token and `handleVerification()` calls `onApproved`. Useful for local development. |
| `integrationTimeout` | `2000` | How long each third-party integration may take to load, in milliseconds, before the SDK skips it. |
| `sessionId` | | The session ID, if you have it when you create the instance. You can also pass it to `track()`. |
| `userId` | | The user ID, if you have it when you create the instance. Requires `sessionId`. |

The constructor throws `ComposerMissingConfigError` when the public API key is missing, and `ComposerInvalidConfigError` when `apiVersion` or `logLevel` isn't one of the values above.

### Track the User

---

Call `track()` as soon as you have a session ID, and again when you know the user ID.

```js
composer.track(sessionId, userId);
```

| Argument | Type | Description |
| --- | --- | --- |
| `sessionId` | `string` | The ID of the current session. Any unique string representing the user's activity in your system. If you don't have one, use the source token from `getSourceToken()`. |
| `userId` | `string` | Optional. The ID of the current user. |

### Get a Source Token

---

`getSourceToken()` returns a token representing this device's recent activity. Pass it to your API whenever your API calls a checkpoint. Source tokens expire after 1 hour, and the SDK refreshes them automatically.

```js
const sourceToken = await composer.getSourceToken();
```

If async/await isn't your thing, you can pass a callback that's called with the source token:

```js
composer.getSourceToken((sourceToken) => {});
```

### Refresh a Source Token

---

`refreshSourceToken()` replaces the current source token with a new one, for example when a user logs out.

```js
const newSourceToken = await composer.refreshSourceToken();
```

Alternatively, you can pass a callback that's called with the new source token:

```js
composer.refreshSourceToken((newSourceToken) => {});
```

### Handle a Verification

---

Pass the verification your API returns to `handleVerification()`. If the workflow needs more from the user, such as MFA or ID verification, the SDK shows those steps and polls until the verification finishes. It then calls the callback that matches the result.

```js
composer.handleVerification(
  verification, // The verification object returned from your API
  {
    onVerified: async (verification) => {
      // The user completed an extra step and the request is approved, but your API hasn't acted yet.
      // Call your API again with verification.id, which it passes to useVerificationId in its checkpoint.
    },
    onApproved: async (verification) => {
      // Approved without an extra step: your API already acted on the request.
    },
    onDenied: async (verification) => {
      // The request was denied.
    },
    onPending: async (verification) => {
      // Optional. The verification is still processing.
    },
    onBlocked: async (verification) => {
      // Optional. The verification is waiting on the user, such as an MFA challenge.
    },
    onUndecided: async (verification) => {
      // Optional. The workflow finished without a verdict. Your application decides how to proceed.
    },
    onError: async (error) => {
      // Optional. The verification didn't finish, and error.details has more information.
      // error.errorType is "CANCELLED" if the user closed the extra step, or "SYSTEM" if the
      // verification failed on the server (for example, a third-party service was unavailable),
      // in which case offering the user a retry can help.
    }
  },
  {
    maxDuration: 24 * 60 * 60 * 1000 // Optional. How long to keep polling, in milliseconds. Defaults to 24 hours.
  }
);
```

| Argument | Type | Description |
| --- | --- | --- |
| `verification` | `object` | The verification object returned from your API. |
| `context` | `object` | The callbacks above. `onVerified` and `onApproved` are required. |
| `options` | `object` | Optional. `maxDuration` sets how long the SDK keeps polling. When it runs out, polling stops without calling another callback, so the last one you received was `onPending` or `onBlocked`. |

## Migrating from @dodgeball/trust-sdk-client

Install `@spreedly/composer-sdk-client` and update your imports. The old names still work, but are deprecated:

| Old name | New name |
| --- | --- |
| `Dodgeball` | `Composer` |
| `useDodgeball` | `useComposer` |
| `DodgeballApiVersion` | `ComposerApiVersion` |
| `IDodgeballConfig` | `IComposerConfig` |
| `window.Dodgeball` | `window.Composer` |

Log lines now start with `Composer SDK:` and error messages with `Composer SDK Error`. If you load the SDK with a script tag, update the URL and pin a version. See the [CHANGELOG](CHANGELOG.md) for everything that changed.

## Development

### Testing

The project uses Jest. To run the tests:

```sh
npm test
```

To build the CommonJS, ES module, UMD and type outputs in `dist/`:

```sh
npm run build
```

### Testing with the examples

To try local SDK changes end to end, build the SDK, pack it, and install the tarball into the `client/web-next` app in [Composer examples](https://github.com/spreedly/composer-examples):

```sh
npm run build && npm pack
```

Then, in `client/web-next`, run `npm install <path to the .tgz>`. Delete `client/web-next/.next` before starting it, so Next.js doesn't serve a cached copy of the previous build.

## License

Apache License 2.0 -- see [LICENSE](LICENSE)

## Support

For support, please contact:

- Email: support@spreedly.com
- Documentation: https://developer.spreedly.com
