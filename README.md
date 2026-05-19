# The Intelligent Bistro

An AI-powered restaurant ordering experience: browse categories and a live menu from Supabase, chat or speak natural-language orders in multiple languages, and let an LLM update your cart with retrieval-augmented context so suggestions stay grounded in real menu data.

The project is a **TypeScript monorepo** with an **Expo (React Native)** client and a **Fastify** API. Dependencies are managed with **npm** in `frontend/` and `backend/`.

---

## Features

- **Category navigation** — Browse by category cards (`categories` table) with Unsplash imagery; drill into items per category.
- **Live menu** — Menu items load from Supabase (`menu_items`); optimized `FlatList` with responsive columns on web.
- **AI concierge** — Streamed chat via Server-Sent Events (SSE); GPT-4o-mini returns structured cart actions (add, remove, update quantity) with explicit-consent guardrails.
- **RAG** — User queries are embedded (`text-embedding-3-small`) and matched against menu vectors via Supabase `match_menu_items`.
- **Voice orders** — Record with `expo-audio`, transcribe through AssemblyAI, then send text into the same AI flow.
- **Multilingual UI** — i18next with 10 locales (English, French, German, Spanish, Chinese, Hindi, Telugu, Kannada, Tamil, Malayalam); menu copy can come from Supabase `translations` JSONB after seeding.
- **Stripe checkout** — Payment Sheet via `@stripe/stripe-react-native` (requires a dev build, not Expo Go).
- **Cart state** — Zustand store with streaming tokens, action application, and a glass-style command bar UI (NativeWind, blur, gradients).
- **Cross-platform** — iOS, Android, and web from a single Expo codebase.

---

## Architecture

```mermaid
flowchart TB
  subgraph client [Expo App - frontend]
    UI[Categories / Menu / Cart / Command Bar]
    I18N[i18next locales]
    SB[(Supabase Anon)]
    API[HTTP + SSE]
    UI --> I18N
    UI --> SB
    UI --> API
  end

  subgraph server [Fastify API - backend]
    CHAT["POST /chat"]
    TRANS["POST /transcribe"]
    PAY["POST /create-payment-intent"]
    RAG[RAG Service]
    AI[OpenAI Chat]
    AAI[AssemblyAI]
    SBS[(Supabase Service Role)]
    CHAT --> RAG --> SBS
    CHAT --> AI
    TRANS --> AAI
  end

  SB -->|categories + menu_items read| DB[(Supabase Postgres + pgvector)]
  SBS -->|match_menu_items RPC| DB
  API --> CHAT
  API --> TRANS
  API --> PAY
```

| Layer | Role |
|--------|------|
| **Frontend** | UI, cart, voice capture, i18n, direct Supabase reads for categories and menu |
| **Backend** | AI chat (SSE), transcription, embeddings + vector search, Stripe payment intents |
| **Supabase** | `categories`, `menu_items` with `embedding` vectors; RPC for similarity search |
| **OpenAI** | Chat completions, embeddings, optional menu/translation generation |
| **AssemblyAI** | Speech-to-text for voice orders |
| **Stripe** | Test-mode Payment Sheet checkout |

---

## Tech stack

### Frontend (`frontend/`)

| Category | Libraries |
|----------|-----------|
| Framework | Expo SDK 54, React 19, React Native 0.81 |
| Styling | NativeWind v2, Tailwind CSS 3 |
| State | Zustand |
| i18n | i18next, react-i18next |
| Data | `@supabase/supabase-js`, Axios |
| Payments | `@stripe/stripe-react-native` |
| Streaming | `react-native-sse` |
| Media | `expo-audio`, `expo-image`, `expo-blur`, `expo-linear-gradient` |
| Animation | `react-native-reanimated` |

### Backend (`backend/`)

| Category | Libraries |
|----------|-----------|
| Server | Fastify 5, `@fastify/cors`, `@fastify/multipart` |
| Validation | Zod 4, `fastify-type-provider-zod` |
| AI / speech | OpenAI SDK, AssemblyAI SDK |
| Payments | Stripe SDK |
| Data | `@supabase/supabase-js` |
| Testing | Jest, ts-jest |
| Runtime | Node.js 20+, TypeScript, `tsx` (dev) |

---

## Project structure

```
The-Intelligent-Bistro/
├── frontend/                 # Expo React Native app
│   ├── App.tsx               # App shell, Stripe provider, chat/voice wiring
│   ├── src/
│   │   ├── components/       # MenuList, CategoryCard, AiCommandBar, CartModal, …
│   │   ├── config/           # api.ts, i18n.ts
│   │   ├── hooks/            # useMenuItems, useCategories, useVoiceOrder, …
│   │   ├── locales/          # UI strings (10 languages)
│   │   ├── services/         # chatStream, transcribeAudio, payment
│   │   ├── store/            # useCartStore, useLanguageStore
│   │   └── lib/              # supabase, stripe (native + web shims)
│   └── .env.example
├── backend/                  # Fastify API
│   ├── src/
│   │   ├── index.ts          # Routes: /health, /chat, /transcribe
│   │   ├── routes/           # payment (Stripe)
│   │   ├── services/         # ai, rag, transcription (+ Jest tests)
│   │   └── scripts/          # seed, translations, categories, eval-ai, …
│   ├── sql/                  # Supabase migrations (categories, translations, images)
│   ├── menu.json             # Seed data for npm run seed
│   └── .env.example
├── .maestro/                 # Maestro E2E flows (see .maestro/README.md)
└── README.md
```

---

## Prerequisites

- **Node.js** 20 or newer
- **npm**
- [Expo Go](https://expo.dev/go) for menu/AI testing, or a **development build** for Stripe checkout (Payment Sheet does not run in Expo Go)
- Accounts / API keys for:
  - [Supabase](https://supabase.com) (Postgres + pgvector)
  - [OpenAI](https://platform.openai.com)
  - [AssemblyAI](https://www.assemblyai.com) (voice transcription)
  - [Stripe](https://stripe.com) (test-mode keys for Payment Sheet)
  - [Unsplash](https://unsplash.com/developers) (optional — `npm run seed-images` for menu item photos)

---

## Supabase setup

The app expects:

1. A **`menu_items`** table with at least: `id`, `name`, `description`, `price`, `category`, `ingredients`, and an **`embedding`** column (`vector` type; enable the pgvector extension).
2. A Postgres function **`match_menu_items`** invoked by the backend RAG layer with parameters `query_embedding`, `match_threshold`, and `match_count` (defaults in code: threshold `0.3`, count `5`).
3. A **`categories`** table for category cards — run `backend/sql/create_categories_table.sql` in the Supabase SQL editor (or apply via CLI migration).
4. Optional **`translations`** JSONB on `menu_items` for localized names/descriptions — run `backend/sql/add_translations_column.sql`, then `npm run seed-translations`.
5. **Row Level Security** so the **anon** key can `SELECT` rows needed for categories and the menu list (frontend reads directly from Supabase).
6. The **service role** key on the backend for RPC / seeding (never ship this key to the client).

### Recommended seed order

```bash
cd backend
cp .env.example .env   # fill in keys first
npm install

# 1. Menu rows + embeddings
npm run seed

# 2. Categories (if not already applied via SQL)
npm run seed-categories

# 3. Optional: Unsplash images on menu items
npm run seed-images

# 4. Optional: OpenAI translations for 9 non-English locales
npm run seed-translations
```

Generate a fresh `menu.json` with OpenAI:

```bash
npm run generate-menu
```

SQL helpers also live in `backend/sql/` (e.g. `update_categories_images.sql`).

---

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Chat + embeddings + seed scripts |
| `ASSEMBLYAI_API_KEY` | Voice transcription |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (or `SUPABASE_KEY`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) for `/create-payment-intent` |
| `UNSPLASH_ACCESS_KEY` | Optional — `npm run seed-images` |
| `PORT` | API port (default `3000`) |

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (categories + menu reads) |
| `EXPO_PUBLIC_API_URL` | Backend base URL (see networking below) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) for Payment Sheet |

Restart the Expo dev server after changing `.env` files.

### Stripe checkout (dev build required)

Payment Sheet uses `@stripe/stripe-react-native` native modules. After setting Stripe keys in both `.env` files and starting the backend:

```bash
cd frontend
npx expo run:ios    # or: npx expo run:android
```

Use test card `4242 4242 4242 4242` in the sheet.

---

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your keys, then optionally run seed commands (see above)

npm run dev
```

The API listens on **`0.0.0.0`** (all interfaces) so physical devices on your LAN can reach it. Default: `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set Supabase + EXPO_PUBLIC_API_URL (+ Stripe keys for checkout)

npm start
```

Then press `i` (iOS simulator), `a` (Android emulator), or `w` (web).

### 3. Verify

```bash
curl http://localhost:3000/health
# {"status":"online","bistro":"ready for orders"}
```

---

## Networking (simulators vs physical devices)

| Environment | `EXPO_PUBLIC_API_URL` |
|-------------|------------------------|
| iOS Simulator / Web | `http://localhost:3000` (default) |
| Android Emulator | `http://10.0.2.2:3000` (auto-fallback if env unset) |
| Physical phone/tablet | `http://<your-computer-LAN-IP>:3000` |

Ensure the backend is running (`npm run dev` in `backend/`) and that your firewall allows inbound connections on the API port.

---

## API reference

### `GET /health`

Health check.

**Response:** `{ "status": "online", "bistro": "ready for orders" }`

### `POST /chat`

Streams AI order handling as **SSE**.

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "Add a burger and fries" }
  ],
  "currentCart": [
    { "itemId": "uuid", "quantity": 1, "notes": "no onions" }
  ]
}
```

The last message must be from the user.

**SSE events:**

| Event | Payload | Meaning |
|-------|---------|---------|
| `token` | string | Streaming assistant text chunk |
| `final_action` | `OrderAction[]` | Cart mutations to apply |
| `action` | `{ conversationalResponse, actions }` | Final assistant payload |
| `error` | string | Terminal error message |

### `POST /transcribe`

Multipart upload of an audio file (max 10 MB).

**Response:** `{ "text": "transcribed utterance" }`

Uses AssemblyAI with configured speech models (`universal-3-pro`, `universal-2`).

### `POST /create-payment-intent`

Creates a Stripe PaymentIntent for the client Payment Sheet.

**Request body:**

```json
{
  "amount": 2499,
  "currency": "usd"
}
```

**Response:** `{ "clientSecret": "pi_..." }`

`amount` is in the smallest currency unit (cents for USD).

---

## NPM scripts

### Frontend

| Script | Command |
|--------|---------|
| `npm start` | `expo start -c` |
| `npm run ios` | `expo run:ios` (dev build) |
| `npm run android` | `expo run:android` (dev build) |
| `npm run web` | `expo start --web` |

### Backend

| Script | Command |
|--------|---------|
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server |
| `npm test` | Jest — AI schema / payload validation |
| `npm run eval-ai` | Offline AI eval script (mock RAG context, no server) |
| `npm run seed` | Insert `menu.json` + embeddings |
| `npm run seed-categories` | Upsert categories from SQL seed data |
| `npm run seed-images` | Attach Unsplash URLs to menu items |
| `npm run seed-translations` | Translate menu via OpenAI (needs `translations` column) |
| `npm run generate-menu` | Generate `menu.json` via OpenAI |

---

## Testing

### Backend unit tests (Jest)

Validates AI JSON schema and related logic without starting the server:

```bash
cd backend
npm test
```

### AI evaluation script

Runs fixed scenarios against `processOrderIntent` with mock retrieved menu context (no Supabase):

```bash
cd backend
npm run eval-ai
```

### Maestro E2E (optional)

UI flows for simulator/emulator testing. See [.maestro/README.md](.maestro/README.md).

```bash
# From repo root — requires dev build installed and menu seeded
maestro test .maestro
```

---

## AI behavior notes

The concierge is instructed to:

- Ground answers in **RAG-retrieved** menu items only (reduces hallucinated dishes).
- Require **explicit user confirmation** before `ADD` actions (suggestions and upsells use an empty `actions` array until the user agrees).
- Emit structured **`actions`** (`ADD`, `REMOVE`, `UPDATE_QUANTITY`, `NONE`) alongside a conversational reply.

The visible menu and categories load live from Supabase. Cart price resolution uses item data from the loaded menu store.

---

## Development tips

- **Hermes / SSE:** The frontend uses `react-native-sse` (XHR-based) because Hermes does not support `fetch` readable streams for SSE on device.
- **Blur on web/Android:** `expo-blur` is used on iOS; other platforms use a semi-opaque fallback for the glass UI.
- **Keyboard:** Android uses `softwareKeyboardLayoutMode: "resize"` and a screen-level `KeyboardAvoidingView` in `App.tsx`.
- **Voice cleanup:** Recordings are deleted via the Expo File API after transcription; local errors surface in `Alert`, not in the AI quote line.
- **Stripe on web:** `src/lib/stripe.web.ts` provides a no-op shim; Payment Sheet is intended for native dev builds.

---

## Security

- Never commit `.env` files or expose the **Supabase service role**, **OpenAI**, or **Stripe secret** keys in the Expo app.
- Use **anon** + RLS on the frontend; restrict writes and sensitive RPCs to the backend.
- CORS is currently `origin: '*'` — tighten for production deployments.

---

## License

No license file is included in this repository. Add one before distributing or open-sourcing the project.
