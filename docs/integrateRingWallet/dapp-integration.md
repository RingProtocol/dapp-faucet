# Ring Wallet — DApp Integration

**How does RingWallet run?** RingWallet is a web wallet that opens DApps in an iframe and injects `window.ethereum`, which meets [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) and [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193).

Ring Wallet is a web-based wallet that opens DApps inside an iframe and injects `window.ethereum`, fully compliant with [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) and [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963).

## 1. Register Your DApp

Contact the Ring Wallet team to register your DApp. Provide:

- **DApp Name**
- **Logo** (256×256 PNG or SVG)
- **DApp URL** (e.g. `https://your-dapp.com`)

You will receive an **API Key** (UUID) for testing.

---

## 2. Integrate the SDK

### 2.1 Add `dappsdk.js` to your project

You can either **self-host** the SDK or **load it from Ring Wallet**. Self-hosting is recommended so your DApp does not depend on the wallet server at runtime.

**Option A — Self-host (recommended)**  
Copy the provided `dappsdk.js` into your static/public directory, then use `src="/dappsdk.js"` in the script tag.

| Framework | Location |
|---|---|
| Plain HTML | Same directory as your HTML |
| React (CRA) | `public/dappsdk.js` |
| Next.js | `public/dappsdk.js` |
| Vue (Vite) | `public/dappsdk.js` |

**Option B — Load from Ring Wallet**  
Use the script URL from the wallet host (e.g. `https://pwa-wallet-git-proxydapp-ring-protocol.vercel.app/dappsdk.js`). You always get the latest SDK, but your DApp depends on that origin being available and you must allow it in CSP (see §2.3).

### 2.2 Add the script tag

**If self-hosting**, add the following `<script>` tag to the **top of `<head>`**, **before** your application bundle:

```html
<head>
  <script src="/dappsdk.js"></script>
  <!-- your app scripts below -->
</head>
```

**If loading from Ring Wallet**, use the full URL (replace with your actual Ring Wallet host if different):

```html
<head>
  <script src="https://pwa-wallet-git-proxydapp-ring-protocol.vercel.app/dappsdk.js"></script>
  <!-- your app scripts below -->
</head>
```

**Next.js (App Router)** — `app/layout.tsx` (use the full Ring Wallet URL if you chose Option B):

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script src="/dappsdk.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Next.js (Pages Router)** — `pages/_document.tsx`:

```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <script src="/dappsdk.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

### 2.3 Allow CSP (if applicable)

If your DApp uses `Content-Security-Policy` headers or meta tags, make sure the policy allows the SDK script to run. Add the following to your `script-src` directive:

```
script-src 'self' 'unsafe-inline';
```

Or if you reference the SDK from a CDN:

```
script-src 'self' https://pwa-wallet-git-proxydapp-ring-protocol.vercel.app;
```

If you don't have a CSP configured, no changes are needed.

### 2.4 What the SDK Injects

The SDK uses two standard Ethereum interfaces:

**`window.ethereum` (EIP-1193)**

The SDK sets `window.ethereum` to a Ring Wallet provider with an extra property `isRingWallet = true` for identification.

- **When running inside Ring Wallet's iframe** — the SDK always overrides `window.ethereum`, even if MetaMask (or another wallet extension) has already injected its own provider into the frame. This ensures that a PC user with MetaMask installed still connects through Ring Wallet when they open your DApp from the wallet.
- **When loaded as a standalone page** (DApp opened directly in the browser, not in the wallet iframe) — the SDK only injects if `window.ethereum` is not already set, so it does not conflict with MetaMask or other extensions in the user's normal browser session.

```javascript
window.ethereum              // EIP-1193 Provider
window.ethereum.isRingWallet  // true
```

**EIP-6963 Provider Discovery**

The SDK announces Ring Wallet via the standard EIP-6963 event mechanism, so libraries like wagmi v2+ and RainbowKit v2+ detect it automatically.

| Field | Value |
|---|---|
| `name` | `"Ring Wallet"` |
| `rdns` | `"org.testring.ringwallet"` |

To detect Ring Wallet specifically via EIP-6963:

```javascript
window.addEventListener('eip6963:announceProvider', (event) => {
  if (event.detail.info.rdns === 'org.testring.ringwallet') {
    const provider = event.detail.provider
    // use provider...
  }
})
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

To check if running inside Ring Wallet:

```javascript
function isInRingWallet() {
  return !!(window.ethereum && window.ethereum.isRingWallet)
}
```

### 2.5 Done

If your DApp uses standard Ethereum libraries (wagmi, ethers.js, web3.js, RainbowKit, etc.), **no further code changes are needed**. The SDK sets up `window.ethereum` and announces via EIP-6963 automatically.

### 2.6 Allow embedding in iframe (when Ring Wallet opens your DApp directly)

If Ring Wallet opens your DApp **without** the proxy (iframe `src` is your DApp URL directly), the browser will refuse to display your page with:

```text
Refused to display 'https://your-dapp.com/' in a frame because it set 'X-Frame-Options' to 'deny'.
```

**Cause:** The response from your DApp includes `X-Frame-Options: deny` (or `SAMEORIGIN` with a different origin). That can come from:

- Your **Next.js** app: `next.config.js` / `next.config.mjs` with `headers` or security headers
- Your **Vercel** project: `vercel.json` `headers`, or Vercel’s own defaults for some deployments
- Another reverse proxy or CDN in front of your app

**Fix:** Allow your app to be embedded only by Ring Wallet using **Content-Security-Policy `frame-ancestors`**. In modern browsers, `frame-ancestors` overrides `X-Frame-Options`, so this works even if something else sets `X-Frame-Options: deny`.

**1. Vercel (`vercel.json`)** — add a `headers` block for your HTML (adjust `source` to match your app, e.g. `"/(.*)"` or `"/"`). If you already have a `"headers"` array in `vercel.json`, append this object as one more element to that array instead of replacing it.

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors 'self' https://pwa-wallet-git-proxydapp-ring-protocol.vercel.app https://*.vercel.app"
        }
      ]
    }
  ]
}
```

Use your real Ring Wallet production host(s) in place of or in addition to the example above. Multiple hosts are space-separated in `frame-ancestors`.

**2. Next.js (`next.config.js` or `next.config.mjs`)** — if you use framework headers instead of Vercel:

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://pwa-wallet-git-proxydapp-ring-protocol.vercel.app https://*.vercel.app",
          },
        ],
      },
    ]
  },
}
```

**3. Remove your own `X-Frame-Options`** — if you explicitly set `X-Frame-Options: deny` (or `SAMEORIGIN`) in `vercel.json` or `next.config.js`, remove that header so only `frame-ancestors` controls embedding. `vercel.json` only **adds** headers; it cannot remove headers Vercel injects, but adding `frame-ancestors` is enough for embedding to work.

After redeploying, open your DApp again from Ring Wallet; the frame error should be gone.

---

## 3. Test

Open Ring Wallet with your API Key in the URL:

```
https://<ring-wallet-host>/?testdapp=YOUR_API_KEY
```

For example:

```
http://localhost:3003/?testdapp=a3f2b1c8-9d4e-4f5a-b6c7-1234567890ab
```

Your DApp will appear in the DApp list even while in review. Click it to verify:

- [ ] Wallet connect dialog appears
- [ ] Transactions trigger the confirmation dialog
- [ ] Signature requests work
- [ ] Rejecting a request returns an error to your DApp

Once verified, notify the Ring Wallet team to set your DApp to **active**.
