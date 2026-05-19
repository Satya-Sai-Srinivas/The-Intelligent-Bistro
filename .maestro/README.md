# Maestro E2E flows

YAML flows for agentic CLI and local UI testing of The Intelligent Bistro (Expo / React Native).

## Prerequisites

1. [Maestro CLI](https://maestro.mobile.dev/docs/getting-started/installing-maestro) installed (`curl -Ls "https://get.maestro.mobile.dev" | bash` or Homebrew).
2. **iOS Simulator** or **Android emulator** running.
3. App built and installed with bundle ID `com.anonymous.frontend` (see `frontend/app.json`):
   ```bash
   cd frontend
   npx expo run:ios
   # or: npx expo run:android
   ```
4. **Supabase** menu seeded (`cd backend && npm run seed`) and `EXPO_PUBLIC_SUPABASE_*` set in the frontend env so categories load.
5. App language **English** is recommended; category and item steps use **case-insensitive regex** (e.g. `(?i).*burgers.*`) so minor copy differences are tolerated.

## Run flows

From the **repository root**:

```bash
maestro test .maestro/order-happy-path.yaml
```

Run all flows in this folder:

```bash
maestro test .maestro
```

## Flows

| File | Description |
|------|-------------|
| `order-happy-path.yaml` | Opens app → Burgers & Sandwiches → adds Truffle Burger via + → opens cart → taps Pay Now |

### Selectors

- `cart-badge`, `cart-pay-now` — `testID` on cart UI
- `menu-add-{itemId}` — `testID` on each menu card + button (numeric Supabase id)
- Category / item / add-to-cart — nested `text:` regex matchers (not exact strings); see `order-happy-path.yaml`
- Loading guard — `assertNotVisible` with `(?i).*loading.*` after launch so the flow waits for the menu fetch to finish

### Stripe

Tapping **Pay Now** opens the Stripe Payment Sheet. Completing payment needs test publishable/secret keys configured. For CI/agents, treat reaching the sheet (or `Processing...`) as an optional success boundary unless Stripe test mode is wired up.

## Backend unit tests (Jest)

Schema / AI payload validation (no server):

```bash
cd backend
npm test
```
