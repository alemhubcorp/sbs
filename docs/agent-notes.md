# Agent Notes

Short project memory for recurring fixes and production incidents.

## 2026-04-29

- task: stabilize AWS deploy and production access
- root cause: Cloudflare DNS was pointing at the wrong tunnel; production traffic was not reaching the active origin path consistently
- fix: align DNS/tunnel mapping in Cloudflare and document production tunnel invariants
- commit: `05c07dc` docs: document production cloudflare tunnel invariants
- deploy result: production domain recovered after tunnel/DNS alignment

- task: stop login session from dropping back to sign-in
- root cause: logout could be triggered through GET/prefetch paths, which cleared auth cookies and caused redirect back to `/signin`
- fix: require explicit POST for logout routes, keep GET logout routes non-destructive, refresh auth entry UI
- commit: `fe6cc97` fix(auth): make logout explicit and refresh auth entry
- deploy result: pending confirmation from production after deploy

## 2026-05-02

- task: stage 1 external UX hardening
- root cause: route shell had hidden mobile navigation and static currency/language pills that looked clickable but did nothing
- fix: add a client shell control with working mobile drawer plus persisted language/currency preferences
- commit: `9587ddd`
- deploy result: pending

- task: stage 2 wishlist implementation
- root cause: wishlist was a placeholder route with no save/remove/list behavior
- fix: add browser-persisted product wishlist controls on catalog/detail pages and a working saved-products page
- commit: pending
- deploy result: pending

- task: stage 3 track order implementation
- root cause: track-order was a placeholder route and did not read live order data
- fix: connect track-order to authenticated retail orders with search, status timeline, and detail/payment links
- commit: pending
- deploy result: pending

- task: stage 4 logistics/customs/shipping implementation
- root cause: logistics, customs, and shipping pages showed static route-health content instead of operational data
- fix: connect logistics/customs to partner assignment boards and shipping to live order tracking
- commit: pending
- deploy result: pending

- task: stage 5 responsive CSS safety
- root cause: core-flow mobile card grid CSS contained a nested selector inside a rule, making the responsive declaration invalid
- fix: replace invalid nested rule with a valid one-column card grid media rule
- commit: pending
- deploy result: pending

- task: stage 6 payment UI safety
- root cause: card payment UI collected raw card number/CVV instead of using the existing hosted provider instruction flow
- fix: keep card as a working payment method, but route users to hosted checkout instructions and confirm completion without sending PAN/CVV through Alemhub
- commit: pending
- deploy result: pending

- task: deploy build hotfix for route shell controls
- root cause: CSS module class lookup returned `string | undefined`, but `document.body.classList.toggle/remove` requires a definite string
- fix: use a fixed global body class name for mobile menu scroll lock
- commit: pending
- deploy result: pending

- task: deploy build hotfix for route shell CSS module
- root cause: CSS Modules reject standalone `:global(.route-shell-menu-locked)` selectors because module selectors must include a local class or id
- fix: remove the global selector and lock mobile menu scroll with client-side `document.body.style.overflow`
- commit: pending
- deploy result: pending

- task: homepage mobile adaptation without redesign
- root cause: the homepage uses an imported static HTML template, so stage 1 route-shell controls did not affect `/`; replacing the shell changed the design too much
- fix: revert the shell replacement, keep the original homepage markup, and add minimal mobile menu/responsive overrides to the existing template
- commit: pending
- deploy result: pending

- task: compact homepage product cards on mobile
- root cause: the smallest mobile override forced product grids to one column, making cards too large
- fix: keep two product-card columns on mobile and reduce image height, typography, and card padding
- commit: pending
- deploy result: pending

- task: unify compact shell controls and dark button contrast
- root cause: public shell mixed long labels (`Currency`, `Language`, `Alerts`) with compact pills and several dark CTA states rendered low-contrast text
- fix: switch shell controls to compact `USD/EN` style, replace alerts text with a bell icon, and enforce white text on shared dark buttons
- commit: `110be66`
- deploy result: pending

- task: route key system events to platform admins
- root cause: admin dashboard showed notifications, but registration and deal lifecycle events were only emitted to marketplace participants, not to platform admins
- fix: add platform-admin fan-out in notification service and emit admin notifications for public registrations, password-reset email requests, and contract-deal lifecycle updates
- commit: `e8c0d0e`
- deploy result: pending

- task: add public branding settings and logo upload
- root cause: site branding was hardcoded in public shells and homepage template, so admin could not safely change the logo or short brand mark from the control panel
- fix: add `public:branding` admin setting, support image upload/data URL storage, expose branding in public settings, and render it in public header/footer surfaces
- commit: `76bc437`
- deploy result: pending

- task: align homepage styling, harden logo upload, and add partner registration
- root cause: homepage still used separate static-template shell styling, branding upload stored the original image format and failed hard when branding setting was unavailable, and public registration only accepted buyer/supplier roles
- fix: align homepage nav/CTA contrast with the shared public shell, convert uploaded logo files to WebP before storing, use a branding fallback in admin settings, and add logistics/customs registration roles with partner organizations and role-safe post-login redirects
- commit: pending
- deploy result: pending
