# API Application Layout

- `main.ts`: bootstrap entrypoint placeholder
- `modules/*`: bounded modules
- future shared code should stay limited to:
  - `app/bootstrap`
  - `app/http`
  - `app/testing`

Do not create generic shared utility layers that bypass module boundaries.
