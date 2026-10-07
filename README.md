# Nostr Inspect

[https://nostrinspect.com](https://nostrinspect.com/)

Inspect, verify and monitor Nostr events from any relay.

Query or stream events from one or more relays, open any event by link and check its signature in the browser, and share links to events and searches.

## ✨ Features

### Monitor

- **Search** (fetch once) or **Stream** (real time) from one or more relays
- Filter by **kind** or by **NIP**, **author** (npub or hex), **tags** (`name:value`), **since / until** and **limit**
- See which relays returned each event

### Event pages

- `/e/<nevent | note | hex id>`: one exact event
- `/a/<naddr>`: the latest version of an addressable or replaceable event
- Verified in your browser: **signature**, **id matches the content**, and **author, kind and `d` tag match the link**
- Which relays have the event, which have an older version and which return an invalid copy
- A notice when a newer version of the event exists

### Sharing

- **Share** button on each event: link to this exact version, or to the latest version
- **Share search**: the filters go in the URL; opening the link fills the form and runs the search

## 🔗 Linking to Nostr Inspect

Any site can add a "Verify on Nostr Inspect" link to its events.

| Link | Shows |
|---|---|
| `https://nostrinspect.com/e/<nevent>` | That exact event. `note1…` and a hex id also work. |
| `https://nostrinspect.com/a/<naddr>` | The latest version of an addressable event, even after its author replaces it. |

Include relay hints in the `nevent` or `naddr`: Nostr Inspect queries those relays together with its default ones.

```js
import { nip19 } from 'nostr-tools';

const relays = ['wss://relay.mostro.network', 'wss://nos.lol'];
const link = 'https://nostrinspect.com/e/' + nip19.neventEncode({ id: event.id, author: event.pubkey, kind: event.kind, relays });
```

### Search links

```
https://nostrinspect.com/?relays=relay.mostro.network,nos.lol&kinds=38383&tag=s:pending&tag=f:CUP&limit=20
```

| Parameter | Field | Format |
|---|---|---|
| `relays` | Relay | Comma separated; `wss://` can be omitted |
| `kinds` | Kind | Comma separated |
| `nips` | NIP | Comma separated; opens the form in "Query by NIP" mode |
| `authors` | Author | `npub` or hex, comma separated |
| `tag` | Tags | Repeated, one per tag: `tag=s:pending&tag=f:CUP` |
| `since` / `until` | Since / Until | Unix timestamp |
| `limit` | Limit | Number |
| `mode` | Search / Stream | `stream`, or omitted for Search |

The search runs when the link is opened. With `mode=stream` the form is filled and the stream starts when you press Stream.

## 📦 Development

```bash
git clone https://github.com/Catrya/nostr-inspect.git
cd nostr-inspect
npm install
npm run dev
```

Then open `http://localhost:8080`.

`npm run test` checks types, lint and tests, then builds. Every push to `main` is deployed to GitHub Pages.

### Example relays

- `wss://relay.mostro.network`
- `wss://relay.damus.io`
- `wss://relay.primal.net`

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS 3
- **Nostr**: Nostrify, nostr-tools
- **Data fetching**: TanStack Query

## 🤝 Contributing

Bootstrapped with [MKStack](https://soapbox.pub/mkstack) and developed with [Claude Code](https://claude.com/claude-code).

Contributions are welcome! Feel free to open an issue or a pull request.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
