# Nostr Events Monitor

[https://catrya.github.io/Nostr-Events-Monitor](https://catrya.github.io/Nostr-Events-Monitor/)

A real-time Nostr events monitoring. Monitor and filter events from any Nostr relay.  

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Nostr Integration**: Nostrify, nostr-tools
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS 3.x

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/Catrya/EventsMonitor.git
cd EventsMonitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

## 🎯 Usage

### Basic Monitoring

1. **Connect to a Relay**: Enter a secure WebSocket URL (wss://) in the Relay field
2. **Start Monitoring**: Click "Start Stream" to begin real-time monitoring
3. **View Events**: Events will appear in real-time as they're published to the relay

### Advanced Filtering

- **Kind**: Filter by specific [event kind](https://nostrdata.github.io/kinds/)
- **Author**: Filter by pubkey (supports npub format)
- **Limit**: Set maximum number of events to fetch
- **Tags**: Filter by specific tags (format: `tagname:value`)
- **Since/Until**: Filter by timestamp ranges

### Example Relay URLs

- `wss://relay.mostro.network`
- `wss://relay.damus.io`
- `wss://relay.nostr.band`
- `wss://relay.primal.net`


## 🤝 Contributing

Bootstrapped with [MKStack](https://soapbox.pub/mkstack)

Contributions are welcome! Please feel free to submit a Pull Request.


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
