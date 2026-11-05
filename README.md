# Kasi Rentals WhatsApp Bot

A Node.js webhook for discovering active room and house rentals through the Meta WhatsApp Cloud API. It asks for a location first, searches the shared Supabase listings, and replies with rental details and signed photo links.

The dashboard repository owns database migrations and listing management. This service does not create or alter the shared schema: it reads `properties` with `status = active`, reads `property_images`, and writes to `conversations` and `messages`.

## Static chat demo

The static demo in `docs/` opens into a WhatsApp-style conversation and reads active listings and their photos from the shared Supabase project. Type `Hi`, choose a location, and choose a suburb when prompted. Live listings link to their matching public detail page in the dashboard. If Supabase is unavailable, the preview falls back to fictional sample listings with detail pages hosted here. The WhatsApp contact link opens a prepared message to Thandi; the visitor must review and send it themselves. The browser chat itself does not send or receive WhatsApp messages.

The browser uses only the Supabase publishable key in `docs/supabase-config.js`. This key is designed for public clients; row-level security in the shared dashboard migration limits anonymous reads to active listings and their images. Never place a service-role key or database password in `docs/`. Before expecting live rentals, apply `supabase/migrations/202611050001_initial_schema.sql` from the dashboard repository to the Supabase project's SQL Editor, then publish at least one active listing with photos. The separate dashboard app also needs its `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` build environment configured to manage listings.

The sample listings page remains available at `/rentals.html`.

To publish it from this repository:

1. Merge the demo changes into `main`.
2. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**.
3. Run the **Deploy static demo to GitHub Pages** workflow from the Actions tab, or push a change to `docs/` on `main`.
4. Open the published URL shown in the workflow's `github-pages` environment.

The workflow uploads only the static `docs/` folder and requires no secrets. Images in the preview are loaded from Unsplash and therefore need an internet connection.

## Requirements

- Node.js 20+
- A Supabase project initialized with the shared schema and a `property-images` Storage bucket
- A Meta app with the WhatsApp product, a registered phone number, and a public HTTPS webhook URL

## Configure

1. Copy `.env.example` to `.env`.
2. Set the Supabase project URL and server-only service role key. Never expose this key in a browser or commit it.
3. Set `META_VERIFY_TOKEN` to a long random string and copy the app secret from Meta.
4. Set the WhatsApp access token and phone number ID. `META_GRAPH_API_VERSION` can be updated to a version enabled for your Meta app.
5. In the Meta app's WhatsApp webhook configuration, subscribe to the `messages` field and set the callback URL to `https://<your-host>/webhook`, using the same verify token.

## Run

```sh
npm install
npm run dev
```

For production, build and start with:

```sh
npm run build
npm start
```

The service exposes `GET /webhook` for Meta verification and `POST /webhook` for signed webhook events. Configure a public HTTPS endpoint (for example, a deployed Node service or a secure tunnel during development); the app listens on `PORT` (default `3000`).

## Bot behavior

- New conversations and greetings receive a prompt to enter a location.
- A location searches active listings by partial, case-insensitive match, returning up to five properties.
- Each result includes the property type, location, monthly rent, number of available and total bedrooms, description, and available listing photos.
- Each live listing reply includes a public dashboard detail link keyed by the Supabase property ID, so a renter can open that listing's other photos and details.
- If no listing photo exists, details are sent as text. Photos are sent using short-lived signed Supabase Storage URLs.
- Inbound and outbound messages are persisted. Duplicate inbound provider message IDs are ignored.
- `hi`, `hello`, `hey`, `start`, `menu`, or `change location` restarts the location prompt.

Owners and agents publish listings through the dashboard. The bot only displays active listings and does not provide listing-management commands.

## Checks

```sh
npm test
npm run build
```
