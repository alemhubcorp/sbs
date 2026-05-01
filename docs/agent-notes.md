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
- commit: pending
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
