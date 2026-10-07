interface KindEntry {
  nip: string;
  description: string;
  link: string;
}

interface KindInfo extends KindEntry {
  classification: string;
}

const NIP_BASE = 'https://github.com/nostr-protocol/nips/blob/master/';
// Kinds known only from the machine-readable registry, with no NIP of their own
const REGISTRY_LINK = 'https://github.com/nostr-protocol/registry-of-kinds/blob/master/schema.yaml';

function nipLink(nip: string): string {
  return `${NIP_BASE}${nip}.md`;
}

// All known NIPs with their file identifiers
const VALID_NIPS: Record<string, { name: string; file: string }> = {
  '01': { name: 'Basic protocol flow description', file: '01' },
  '02': { name: 'Follow List', file: '02' },
  '03': { name: 'OpenTimestamps Attestations for Events', file: '03' },
  '04': { name: 'Encrypted Direct Message', file: '04' },
  '05': { name: 'Mapping Nostr keys to DNS-based internet identifiers', file: '05' },
  '06': { name: 'Basic key derivation from mnemonic seed phrase', file: '06' },
  '07': { name: 'window.nostr capability for web browsers', file: '07' },
  '08': { name: 'Handling Mentions', file: '08' },
  '09': { name: 'Event Deletion Request', file: '09' },
  '10': { name: 'Text Notes and Threads', file: '10' },
  '11': { name: 'Relay Information Document', file: '11' },
  '13': { name: 'Proof of Work', file: '13' },
  '14': { name: 'Subject tag in text events', file: '14' },
  '15': { name: 'Nostr Marketplace (for resilient marketplaces)', file: '15' },
  '17': { name: 'Private Direct Messages', file: '17' },
  '18': { name: 'Reposts', file: '18' },
  '19': { name: 'bech32-encoded entities', file: '19' },
  '21': { name: 'nostr: URI scheme', file: '21' },
  '22': { name: 'Comment', file: '22' },
  '23': { name: 'Long-form Content', file: '23' },
  '24': { name: 'Extra metadata fields and tags', file: '24' },
  '25': { name: 'Reactions', file: '25' },
  '26': { name: 'Delegated Event Signing', file: '26' },
  '27': { name: 'Text Note References', file: '27' },
  '28': { name: 'Public Chat', file: '28' },
  '29': { name: 'Relay-based Groups', file: '29' },
  '30': { name: 'Custom Emoji', file: '30' },
  '31': { name: 'Dealing with Unknown Events', file: '31' },
  '32': { name: 'Labeling', file: '32' },
  '34': { name: 'git stuff', file: '34' },
  '35': { name: 'Torrents', file: '35' },
  '36': { name: 'Sensitive Content', file: '36' },
  '37': { name: 'Draft Events', file: '37' },
  '38': { name: 'User Statuses', file: '38' },
  '39': { name: 'Linking Profiles to Other Platforms', file: '39' },
  '40': { name: 'Expiration Timestamp', file: '40' },
  '42': { name: 'Authentication of clients to relays', file: '42' },
  '43': { name: 'Relay Access Metadata and Requests', file: '43' },
  '44': { name: 'Encrypted Payloads (Versioned)', file: '44' },
  '45': { name: 'Counting results', file: '45' },
  '46': { name: 'Nostr Remote Signing', file: '46' },
  '47': { name: 'Nostr Wallet Connect', file: '47' },
  '48': { name: 'Bridged Events', file: '48' },
  '49': { name: 'Private Key Encryption (ncryptsec)', file: '49' },
  '50': { name: 'Search Capability', file: '50' },
  '51': { name: 'Lists', file: '51' },
  '52': { name: 'Calendar Events', file: '52' },
  '53': { name: 'Live Streaming and Spaces', file: '53' },
  '54': { name: 'Wiki', file: '54' },
  '55': { name: 'Android Signer Application', file: '55' },
  '56': { name: 'Reporting', file: '56' },
  '57': { name: 'Lightning Zaps', file: '57' },
  '58': { name: 'Badges', file: '58' },
  '59': { name: 'Gift Wrap', file: '59' },
  '5A': { name: 'Static Websites (nsites)', file: '5A' },
  '60': { name: 'Cashu Wallet', file: '60' },
  '61': { name: 'Nutzaps', file: '61' },
  '62': { name: 'Request to Vanish', file: '62' },
  '64': { name: 'Chess (PGN)', file: '64' },
  '65': { name: 'Relay List Metadata', file: '65' },
  '66': { name: 'Relay Discovery and Liveness Monitoring', file: '66' },
  '67': { name: 'EOSE Completeness Hint', file: '67' },
  '68': { name: 'Picture-first feeds', file: '68' },
  '69': { name: 'Peer-to-peer Order events', file: '69' },
  '70': { name: 'Protected Events', file: '70' },
  '71': { name: 'Video Events', file: '71' },
  '72': { name: 'Moderated Communities', file: '72' },
  '73': { name: 'External Content IDs', file: '73' },
  '75': { name: 'Zap Goals', file: '75' },
  '77': { name: 'Negentropy Syncing', file: '77' },
  '78': { name: 'Application-specific data', file: '78' },
  '7D': { name: 'Forum Threads', file: '7D' },
  '84': { name: 'Highlights', file: '84' },
  '85': { name: 'Trusted Assertions', file: '85' },
  '86': { name: 'Relay Management API', file: '86' },
  '87': { name: 'Cashu and Fedimint Discoverability', file: '87' },
  '88': { name: 'Polls', file: '88' },
  '89': { name: 'Recommended Application Handlers', file: '89' },
  '90': { name: 'Data Vending Machines', file: '90' },
  '92': { name: 'Media Attachments Metadata (imeta)', file: '92' },
  '94': { name: 'File Metadata', file: '94' },
  '96': { name: 'HTTP File Storage Integration', file: '96' },
  '98': { name: 'HTTP Auth', file: '98' },
  '99': { name: 'Classified Listings', file: '99' },
  'A0': { name: 'Voice Messages', file: 'A0' },
  'A3': { name: 'payto: Payment Targets', file: 'A3' },
  'A4': { name: 'Public Messages', file: 'A4' },
  'B0': { name: 'Web Bookmarks', file: 'B0' },
  'B7': { name: 'Blossom', file: 'B7' },
  'BE': { name: 'Nostr BLE Communications Protocol', file: 'BE' },
  'C0': { name: 'Code Snippets', file: 'C0' },
  'C7': { name: 'Chats', file: 'C7' },
  'CC': { name: 'Geocaching', file: 'CC' },
  'EE': { name: 'E2EE Messaging using MLS Protocol', file: 'EE' },
  'F4': { name: 'Podcasts', file: 'F4' },
};

function normalizeNipId(nipId: string): string {
  const cleaned = nipId.trim().toUpperCase().replace(/^NIP-?/i, '');
  // Pad single digit numbers with leading zero for lookup
  if (/^\d$/.test(cleaned)) return '0' + cleaned;
  return cleaned;
}

export function getNipInfo(nipId: string): { exists: boolean; name: string; link: string } | null {
  const normalized = normalizeNipId(nipId);
  const nip = VALID_NIPS[normalized];
  if (!nip) return null;
  return { exists: true, name: nip.name, link: nipLink(nip.file) };
}

const KIND_MAP: Record<number, KindEntry> = {
  0:     { nip: 'NIP-01', description: 'User Metadata', link: nipLink('01') },
  1:     { nip: 'NIP-10', description: 'Short Text Note', link: nipLink('10') },
  2:     { nip: 'NIP-01', description: 'Recommend Relay (deprecated)', link: nipLink('01') },
  3:     { nip: 'NIP-02', description: 'Follows', link: nipLink('02') },
  4:     { nip: 'NIP-04', description: 'Encrypted Direct Messages', link: nipLink('04') },
  5:     { nip: 'NIP-09', description: 'Event Deletion Request', link: nipLink('09') },
  6:     { nip: 'NIP-18', description: 'Repost', link: nipLink('18') },
  7:     { nip: 'NIP-25', description: 'Reaction', link: nipLink('25') },
  8:     { nip: 'NIP-58', description: 'Badge Award', link: nipLink('58') },
  9:     { nip: 'NIP-C7', description: 'Chat Message', link: nipLink('C7') },
  10:    { nip: 'NIP-29', description: 'Group Chat Threaded Reply (deprecated)', link: nipLink('29') },
  11:    { nip: 'NIP-7D', description: 'Thread', link: nipLink('7D') },
  12:    { nip: 'NIP-29', description: 'Group Thread Reply (deprecated)', link: nipLink('29') },
  13:    { nip: 'NIP-59', description: 'Seal', link: nipLink('59') },
  14:    { nip: 'NIP-17', description: 'Direct Message', link: nipLink('17') },
  15:    { nip: 'NIP-17', description: 'File Message', link: nipLink('17') },
  16:    { nip: 'NIP-18', description: 'Generic Repost', link: nipLink('18') },
  17:    { nip: 'NIP-25', description: 'Reaction to a website', link: nipLink('25') },
  20:    { nip: 'NIP-68', description: 'Picture', link: nipLink('68') },
  21:    { nip: 'NIP-71', description: 'Video Event', link: nipLink('71') },
  22:    { nip: 'NIP-71', description: 'Short-form Portrait Video Event', link: nipLink('71') },
  24:    { nip: 'NIP-A4', description: 'Public Message', link: nipLink('A4') },
  30:    { nip: 'NKBIP-03', description: 'Internal reference', link: 'https://wikistr.com/nkbip-03*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  31:    { nip: 'NKBIP-03', description: 'External web reference', link: 'https://wikistr.com/nkbip-03*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  32:    { nip: 'NKBIP-03', description: 'Hardcopy reference', link: 'https://wikistr.com/nkbip-03*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  33:    { nip: 'NKBIP-03', description: 'Prompt reference', link: 'https://wikistr.com/nkbip-03*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  40:    { nip: 'NIP-28', description: 'Channel Creation', link: nipLink('28') },
  41:    { nip: 'NIP-28', description: 'Channel Metadata', link: nipLink('28') },
  42:    { nip: 'NIP-28', description: 'Channel Message', link: nipLink('28') },
  43:    { nip: 'NIP-28', description: 'Channel Hide Message', link: nipLink('28') },
  44:    { nip: 'NIP-28', description: 'Channel Mute User', link: nipLink('28') },
  54:    { nip: 'NIP-F4', description: 'Podcast Episode', link: nipLink('F4') },
  62:    { nip: 'NIP-62', description: 'Request to Vanish', link: nipLink('62') },
  64:    { nip: 'NIP-64', description: 'Chess (PGN)', link: nipLink('64') },
  78:    { nip: 'NIP-78', description: 'Application-specific Data', link: nipLink('78') },
  82:    { nip: '', description: 'Medical Data (FHIR)', link: REGISTRY_LINK },
  443:   { nip: 'Marmot', description: 'KeyPackage', link: 'https://github.com/marmot-protocol/marmot' },
  444:   { nip: 'Marmot', description: 'Welcome Message', link: 'https://github.com/marmot-protocol/marmot' },
  445:   { nip: 'Marmot', description: 'Group Event', link: 'https://github.com/marmot-protocol/marmot' },
  777:   { nip: '', description: 'Spell', link: REGISTRY_LINK },
  818:   { nip: 'NIP-54', description: 'Merge Requests', link: nipLink('54') },
  1010:  { nip: '', description: 'Text Note Edit', link: REGISTRY_LINK },
  1018:  { nip: 'NIP-88', description: 'Poll Response', link: nipLink('88') },
  1021:  { nip: 'NIP-15', description: 'Bid', link: nipLink('15') },
  1022:  { nip: 'NIP-15', description: 'Bid confirmation', link: nipLink('15') },
  1040:  { nip: 'NIP-03', description: 'OpenTimestamps', link: nipLink('03') },
  1059:  { nip: 'NIP-59', description: 'Gift Wrap', link: nipLink('59') },
  1063:  { nip: 'NIP-94', description: 'File Metadata', link: nipLink('94') },
  1064:  { nip: '', description: 'Blob Data (NIP-95)', link: REGISTRY_LINK },
  1065:  { nip: '', description: 'Blob Header (NIP-95)', link: REGISTRY_LINK },
  1068:  { nip: 'NIP-88', description: 'Poll', link: nipLink('88') },
  1073:  { nip: '', description: 'Music Track Scrobble', link: REGISTRY_LINK },
  1111:  { nip: 'NIP-22', description: 'Comment', link: nipLink('22') },
  1163:  { nip: '', description: 'Exclusive Content Membership', link: REGISTRY_LINK },
  1222:  { nip: 'NIP-A0', description: 'Voice Message', link: nipLink('A0') },
  1227:  { nip: '', description: 'Scroll', link: REGISTRY_LINK },
  1234:  { nip: 'NIP-37', description: 'Draft Checkpoint', link: nipLink('37') },
  1244:  { nip: 'NIP-A0', description: 'Voice Message Comment', link: nipLink('A0') },
  1301:  { nip: '', description: 'Workout Record', link: REGISTRY_LINK },
  1311:  { nip: 'NIP-53', description: 'Live Chat Message', link: nipLink('53') },
  1312:  { nip: '', description: 'Live Activity Raid', link: REGISTRY_LINK },
  1313:  { nip: '', description: 'Live Activity Clip', link: REGISTRY_LINK },
  1315:  { nip: '', description: 'Road Event Report', link: REGISTRY_LINK },
  1316:  { nip: '', description: 'Road Event Confirmation', link: REGISTRY_LINK },
  1337:  { nip: 'NIP-C0', description: 'Code Snippet', link: nipLink('C0') },
  1617:  { nip: 'NIP-34', description: 'Patches', link: nipLink('34') },
  1618:  { nip: 'NIP-34', description: 'Pull Requests', link: nipLink('34') },
  1619:  { nip: 'NIP-34', description: 'Pull Request Updates', link: nipLink('34') },
  1621:  { nip: 'NIP-34', description: 'Issues', link: nipLink('34') },
  1622:  { nip: 'NIP-34', description: 'Git Replies (deprecated)', link: nipLink('34') },
  1630:  { nip: 'NIP-34', description: 'Status', link: nipLink('34') },
  1631:  { nip: 'NIP-34', description: 'Status', link: nipLink('34') },
  1632:  { nip: 'NIP-34', description: 'Status', link: nipLink('34') },
  1633:  { nip: 'NIP-34', description: 'Status', link: nipLink('34') },
  1808:  { nip: '', description: 'Audio Header', link: REGISTRY_LINK },
  1971:  { nip: 'Nostrocket', description: 'Problem Tracker', link: 'https://github.com/nostrocket/NIPS/blob/main/Problems.md' },
  1984:  { nip: 'NIP-56', description: 'Reporting', link: nipLink('56') },
  1985:  { nip: 'NIP-32', description: 'Label', link: nipLink('32') },
  1986:  { nip: '', description: 'Relay reviews', link: '' },
  1987:  { nip: 'NKBIP-02', description: 'AI Embeddings / Vector lists', link: 'https://wikistr.com/nkbip-02*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  2003:  { nip: 'NIP-35', description: 'Torrent', link: nipLink('35') },
  2004:  { nip: 'NIP-35', description: 'Torrent Comment', link: nipLink('35') },
  2022:  { nip: 'joinstr', description: 'Coinjoin Pool', link: 'https://gitlab.com/1440000bytes/joinstr/-/blob/main/NIP.md' },
  3063:  { nip: '', description: 'Software Asset', link: REGISTRY_LINK },
  4312:  { nip: '', description: 'Nests Admin Command', link: REGISTRY_LINK },
  4454:  { nip: '', description: 'Decoupled Key Client Announcement', link: REGISTRY_LINK },
  4455:  { nip: '', description: 'Decoupled Encryption Key Distribution', link: REGISTRY_LINK },
  4550:  { nip: 'NIP-72', description: 'Community Post Approval', link: nipLink('72') },
  5128:  { nip: 'NIP-5A', description: 'nsite manifest snapshot', link: nipLink('5A') },
  7000:  { nip: 'NIP-90', description: 'Job Feedback', link: nipLink('90') },
  7374:  { nip: 'NIP-60', description: 'Reserved Cashu Wallet Tokens', link: nipLink('60') },
  7375:  { nip: 'NIP-60', description: 'Cashu Wallet Tokens', link: nipLink('60') },
  7376:  { nip: 'NIP-60', description: 'Cashu Wallet History', link: nipLink('60') },
  7516:  { nip: 'NIP-CC', description: 'Geocache log', link: nipLink('CC') },
  7517:  { nip: 'NIP-CC', description: 'Geocache proof of find', link: nipLink('CC') },
  8000:  { nip: 'NIP-43', description: 'Add User', link: nipLink('43') },
  8001:  { nip: 'NIP-43', description: 'Remove User', link: nipLink('43') },
  8333:  { nip: '', description: 'Onchain Zap', link: REGISTRY_LINK },
  8828:  { nip: '', description: 'Timeline Act', link: REGISTRY_LINK },
  9041:  { nip: 'NIP-75', description: 'Zap Goal', link: nipLink('75') },
  9321:  { nip: 'NIP-61', description: 'Nutzap', link: nipLink('61') },
  9467:  { nip: 'Tidal-nostr', description: 'Tidal login', link: 'https://wikistr.com/tidal-nostr' },
  9733:  { nip: '', description: 'Private Zap', link: REGISTRY_LINK },
  9734:  { nip: 'NIP-57', description: 'Zap Request', link: nipLink('57') },
  9735:  { nip: 'NIP-57', description: 'Zap', link: nipLink('57') },
  9802:  { nip: 'NIP-84', description: 'Highlights', link: nipLink('84') },
  10000: { nip: 'NIP-51', description: 'Mute list', link: nipLink('51') },
  10001: { nip: 'NIP-51', description: 'Pin list', link: nipLink('51') },
  10002: { nip: 'NIP-65', description: 'Relay List Metadata', link: nipLink('65') },
  10003: { nip: 'NIP-51', description: 'Bookmark list', link: nipLink('51') },
  10004: { nip: 'NIP-51', description: 'Communities list', link: nipLink('51') },
  10005: { nip: 'NIP-51', description: 'Public chats list', link: nipLink('51') },
  10006: { nip: 'NIP-51', description: 'Blocked relays list', link: nipLink('51') },
  10007: { nip: 'NIP-51', description: 'Search relays list', link: nipLink('51') },
  10008: { nip: 'NIP-58', description: 'Profile Badges', link: nipLink('58') },
  10009: { nip: 'NIP-29', description: 'User groups', link: nipLink('29') },
  10011: { nip: 'NIP-39', description: 'External Identities', link: nipLink('39') },
  10012: { nip: 'NIP-51', description: 'Favorite relays list', link: nipLink('51') },
  10013: { nip: 'NIP-37', description: 'Private event relay list', link: nipLink('37') },
  10015: { nip: 'NIP-51', description: 'Interests list', link: nipLink('51') },
  10019: { nip: 'NIP-61', description: 'Nutzap Mint Recommendation', link: nipLink('61') },
  10020: { nip: 'NIP-51', description: 'Media follows', link: nipLink('51') },
  10021: { nip: 'NIP-51', description: 'Favorite follow sets', link: nipLink('51') },
  10030: { nip: 'NIP-51', description: 'User emoji list', link: nipLink('51') },
  10031: { nip: '', description: 'User sticker pack list', link: REGISTRY_LINK },
  10040: { nip: 'NIP-85', description: 'Trusted Service Providers', link: nipLink('85') },
  10044: { nip: '', description: 'Decoupled Key Announcement', link: REGISTRY_LINK },
  10050: { nip: 'NIP-17', description: 'Relay list to receive DMs', link: nipLink('17') },
  10051: { nip: 'Marmot', description: 'KeyPackage Relays List', link: 'https://github.com/marmot-protocol/marmot' },
  10054: { nip: 'NIP-51', description: 'Favorite podcasts list', link: nipLink('51') },
  10063: { nip: 'NIP-B7', description: 'User server list', link: nipLink('B7') },
  10064: { nip: 'NIP-51', description: 'Authored podcasts list', link: nipLink('51') },
  10096: { nip: 'NIP-96', description: 'File storage server list (deprecated)', link: nipLink('96') },
  10101: { nip: '', description: 'Good Wiki Authors', link: REGISTRY_LINK },
  10102: { nip: '', description: 'Good Wiki Relays', link: REGISTRY_LINK },
  10112: { nip: '', description: 'Nests Server List', link: REGISTRY_LINK },
  10133: { nip: 'NIP-A3', description: 'Payment Targets', link: nipLink('A3') },
  10154: { nip: 'NIP-F4', description: 'Podcast Metadata', link: nipLink('F4') },
  10163: { nip: '', description: 'Exclusive Content Announcement', link: REGISTRY_LINK },
  10164: { nip: '', description: 'Authored Podcasts', link: REGISTRY_LINK },
  10166: { nip: 'NIP-66', description: 'Relay Monitor Announcement', link: nipLink('66') },
  10312: { nip: 'NIP-53', description: 'Room Presence', link: nipLink('53') },
  10317: { nip: '', description: 'User Grasp List', link: REGISTRY_LINK },
  10377: { nip: 'Nostr Epoxy', description: 'Proxy Announcement', link: 'https://github.com/Origami74/nostr-epoxy-reverse-proxy' },
  11111: { nip: 'Nostr Epoxy', description: 'Transport Method Announcement', link: 'https://github.com/Origami74/nostr-epoxy-reverse-proxy' },
  11871: { nip: '', description: 'Attestor Proficiency', link: REGISTRY_LINK },
  12473: { nip: '', description: 'Birdex', link: REGISTRY_LINK },
  13194: { nip: 'NIP-47', description: 'Wallet Info', link: nipLink('47') },
  13534: { nip: 'NIP-43', description: 'Membership Lists', link: nipLink('43') },
  14388: { nip: 'Corny Chat', description: 'User Sound Effect Lists', link: 'https://cornychat.com/datatypes#kind14388usersoundeffectslist' },
  15128: { nip: 'NIP-5A', description: 'Root nsite manifest', link: nipLink('5A') },
  15129: { nip: '', description: 'Root Napplet', link: REGISTRY_LINK },
  17375: { nip: 'NIP-60', description: 'Cashu Wallet Event', link: nipLink('60') },
  21000: { nip: 'Lightning.Pub', description: 'Lightning Pub RPC', link: 'https://github.com/shocknet/Lightning.Pub/blob/master/proto/autogenerated/client.md' },
  21001: { nip: '', description: 'CLINK Offer', link: REGISTRY_LINK },
  21002: { nip: '', description: 'CLINK Debit', link: REGISTRY_LINK },
  21003: { nip: '', description: 'CLINK Manage', link: REGISTRY_LINK },
  21059: { nip: 'NIP-59', description: 'Ephemeral Gift Wrap', link: nipLink('59') },
  22242: { nip: 'NIP-42', description: 'Client Authentication', link: nipLink('42') },
  23194: { nip: 'NIP-47', description: 'Wallet Request', link: nipLink('47') },
  23195: { nip: 'NIP-47', description: 'Wallet Response', link: nipLink('47') },
  23196: { nip: '', description: 'NWC Notification (Legacy)', link: REGISTRY_LINK },
  23197: { nip: '', description: 'NWC Notification', link: REGISTRY_LINK },
  23333: { nip: '', description: 'Ephemeral Chat Room', link: REGISTRY_LINK },
  23903: { nip: '', description: 'Wake Up', link: REGISTRY_LINK },
  24133: { nip: 'NIP-46', description: 'Nostr Connect', link: nipLink('46') },
  24242: { nip: 'NIP-B7', description: 'Blobs stored on mediaservers', link: nipLink('B7') },
  25050: { nip: '', description: 'Call Offer', link: REGISTRY_LINK },
  25051: { nip: '', description: 'Call Answer', link: REGISTRY_LINK },
  25052: { nip: '', description: 'Call ICE Candidate', link: REGISTRY_LINK },
  25053: { nip: '', description: 'Call Hangup', link: REGISTRY_LINK },
  25054: { nip: '', description: 'Call Reject', link: REGISTRY_LINK },
  25055: { nip: '', description: 'Call Renegotiate', link: REGISTRY_LINK },
  27235: { nip: 'NIP-98', description: 'HTTP Auth', link: nipLink('98') },
  28934: { nip: 'NIP-43', description: 'Join Request', link: nipLink('43') },
  28935: { nip: 'NIP-43', description: 'Invite Request', link: nipLink('43') },
  28936: { nip: 'NIP-43', description: 'Leave Request', link: nipLink('43') },
  30000: { nip: 'NIP-51', description: 'Follow sets', link: nipLink('51') },
  30001: { nip: 'NIP-51', description: 'Generic lists (deprecated)', link: nipLink('51') },
  30002: { nip: 'NIP-51', description: 'Relay sets', link: nipLink('51') },
  30003: { nip: 'NIP-51', description: 'Bookmark sets', link: nipLink('51') },
  30004: { nip: 'NIP-51', description: 'Curation sets', link: nipLink('51') },
  30005: { nip: 'NIP-51', description: 'Video sets', link: nipLink('51') },
  30006: { nip: 'NIP-51', description: 'Picture sets', link: nipLink('51') },
  30007: { nip: 'NIP-51', description: 'Kind mute sets', link: nipLink('51') },
  30008: { nip: 'NIP-58', description: 'Badge sets', link: nipLink('58') },
  30009: { nip: 'NIP-58', description: 'Badge Definition', link: nipLink('58') },
  30015: { nip: 'NIP-51', description: 'Interest sets', link: nipLink('51') },
  30017: { nip: 'NIP-15', description: 'Create or update a stall', link: nipLink('15') },
  30018: { nip: 'NIP-15', description: 'Create or update a product', link: nipLink('15') },
  30019: { nip: 'NIP-15', description: 'Marketplace UI/UX', link: nipLink('15') },
  30020: { nip: 'NIP-15', description: 'Product sold as an auction', link: nipLink('15') },
  30023: { nip: 'NIP-23', description: 'Long-form Content', link: nipLink('23') },
  30024: { nip: 'NIP-23', description: 'Draft Long-form Content', link: nipLink('23') },
  30030: { nip: 'NIP-51', description: 'Emoji sets', link: nipLink('51') },
  30031: { nip: '', description: 'Sticker pack', link: REGISTRY_LINK },
  30040: { nip: 'NKBIP-01', description: 'Curated Publication Index', link: 'https://wikistr.com/nkbip-01*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  30041: { nip: 'NKBIP-01', description: 'Curated Publication Content', link: 'https://wikistr.com/nkbip-01*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1' },
  30053: { nip: '', description: 'NNS Name', link: REGISTRY_LINK },
  30063: { nip: 'NIP-51', description: 'Release artifact sets', link: nipLink('51') },
  30078: { nip: 'NIP-78', description: 'Application-specific Data', link: nipLink('78') },
  30166: { nip: 'NIP-66', description: 'Relay Discovery', link: nipLink('66') },
  30267: { nip: 'NIP-51', description: 'App curation sets', link: nipLink('51') },
  30296: { nip: '', description: 'Interactive Story Prologue', link: REGISTRY_LINK },
  30297: { nip: '', description: 'Interactive Story Scene', link: REGISTRY_LINK },
  30298: { nip: '', description: 'Interactive Story Reading State', link: REGISTRY_LINK },
  30311: { nip: 'NIP-53', description: 'Live Event', link: nipLink('53') },
  30312: { nip: 'NIP-53', description: 'Interactive Room', link: nipLink('53') },
  30313: { nip: 'NIP-53', description: 'Conference Event', link: nipLink('53') },
  30315: { nip: 'NIP-38', description: 'User Statuses', link: nipLink('38') },
  30382: { nip: 'NIP-85', description: 'User Trusted Assertion', link: nipLink('85') },
  30383: { nip: 'NIP-85', description: 'Event Trusted Assertion', link: nipLink('85') },
  30384: { nip: 'NIP-85', description: 'Addressable Trusted Assertion', link: nipLink('85') },
  30385: { nip: 'NIP-85', description: 'External ID Assertion', link: nipLink('85') },
  30388: { nip: 'Corny Chat', description: 'Slide Set', link: 'https://cornychat.com/datatypes#kind30388slideset' },
  30402: { nip: 'NIP-99', description: 'Classified Listing', link: nipLink('99') },
  30403: { nip: 'NIP-99', description: 'Draft Classified Listing', link: nipLink('99') },
  30617: { nip: 'NIP-34', description: 'Repository announcements', link: nipLink('34') },
  30618: { nip: 'NIP-34', description: 'Repository state announcements', link: nipLink('34') },
  30818: { nip: 'NIP-54', description: 'Wiki article', link: nipLink('54') },
  30819: { nip: 'NIP-54', description: 'Redirects', link: nipLink('54') },
  30828: { nip: '', description: 'Timeline Card', link: REGISTRY_LINK },
  31234: { nip: 'NIP-37', description: 'Draft Event', link: nipLink('37') },
  31337: { nip: '', description: 'Audio Track', link: REGISTRY_LINK },
  31388: { nip: 'Corny Chat', description: 'Link Set', link: 'https://cornychat.com/datatypes#kind31388linkset' },
  31436: { nip: '', description: 'Gopherhole Document', link: REGISTRY_LINK },
  31871: { nip: '', description: 'Attestation', link: REGISTRY_LINK },
  31872: { nip: '', description: 'Attestation Request', link: REGISTRY_LINK },
  31873: { nip: '', description: 'Attestor Recommendation', link: REGISTRY_LINK },
  31890: { nip: 'Custom Feeds', description: 'Feed', link: 'https://wikifreedia.xyz/cip-01/' },
  31922: { nip: 'NIP-52', description: 'Date-Based Calendar Event', link: nipLink('52') },
  31923: { nip: 'NIP-52', description: 'Time-Based Calendar Event', link: nipLink('52') },
  31924: { nip: 'NIP-52', description: 'Calendar', link: nipLink('52') },
  31925: { nip: 'NIP-52', description: 'Calendar Event RSVP', link: nipLink('52') },
  31989: { nip: 'NIP-89', description: 'Handler recommendation', link: nipLink('89') },
  31990: { nip: 'NIP-89', description: 'Handler information', link: nipLink('89') },
  31992: { nip: '', description: 'Slash Command Definition', link: REGISTRY_LINK },
  32267: { nip: '', description: 'Software Application', link: '' },
  32388: { nip: 'Corny Chat', description: 'User Room Favorites', link: 'https://cornychat.com/datatypes#kind32388roomfavorites' },
  33388: { nip: 'Corny Chat', description: 'High Scores', link: 'https://cornychat.com/datatypes#kind33388highscores' },
  33401: { nip: '', description: 'Exercise Template', link: REGISTRY_LINK },
  33534: { nip: 'NIP-43', description: 'Role Definition', link: nipLink('43') },
  33863: { nip: '', description: 'Fundraiser', link: REGISTRY_LINK },
  34139: { nip: '', description: 'Music Playlist', link: REGISTRY_LINK },
  34235: { nip: 'NIP-71', description: 'Addressable Video Event', link: nipLink('71') },
  34236: { nip: 'NIP-71', description: 'Addressable Short Video Event', link: nipLink('71') },
  34388: { nip: 'Corny Chat', description: 'Sound Effects', link: 'https://cornychat.com/datatypes#kind34388soundeffectsets' },
  34550: { nip: 'NIP-72', description: 'Community Definition', link: nipLink('72') },
  34128: { nip: 'NIP-5A', description: 'Legacy nsite manifest (deprecated)', link: nipLink('5A') },
  34551: { nip: '', description: 'Community Rules', link: REGISTRY_LINK },
  35128: { nip: 'NIP-5A', description: 'Named nsite manifest', link: nipLink('5A') },
  35129: { nip: '', description: 'Named Napplet', link: REGISTRY_LINK },
  35130: { nip: '', description: 'Napp', link: REGISTRY_LINK },
  36787: { nip: '', description: 'Music Tracks', link: REGISTRY_LINK },
  36820: { nip: 'Hitchhiking Data Standard', description: 'Hitchhiking Ride', link: 'https://github.com/Hitchwiki/hitchhiking-data-standard' },
  37515: { nip: '', description: 'Geocache Listing', link: REGISTRY_LINK },
  37516: { nip: 'NIP-CC', description: 'Geocache listing', link: nipLink('CC') },
  37517: { nip: 'NIP-CC', description: 'Geocache Curation List', link: nipLink('CC') },
  38000: { nip: 'NIP-87', description: 'Mint Recommendation', link: nipLink('87') },
  38172: { nip: 'NIP-87', description: 'Cashu Mint Announcement', link: nipLink('87') },
  38173: { nip: 'NIP-87', description: 'Fedimint Announcement', link: nipLink('87') },
  38383: { nip: 'NIP-69', description: 'Peer-to-peer Order events', link: nipLink('69') },
  39089: { nip: 'NIP-51', description: 'Starter packs', link: nipLink('51') },
  39092: { nip: 'NIP-51', description: 'Media starter packs', link: nipLink('51') },
  39701: { nip: 'NIP-B0', description: 'Web bookmarks', link: nipLink('B0') },
};

interface RangeEntry {
  min: number;
  max: number;
  nip: string;
  description: string;
  link: string;
}

const KIND_RANGES: RangeEntry[] = [
  { min: 5000, max: 5999, nip: 'NIP-90', description: 'Job Request', link: nipLink('90') },
  { min: 6000, max: 6999, nip: 'NIP-90', description: 'Job Result', link: nipLink('90') },
  { min: 9000, max: 9030, nip: 'NIP-29', description: 'Group Control Events', link: nipLink('29') },
  { min: 39000, max: 39009, nip: 'NIP-29', description: 'Group metadata events', link: nipLink('29') },
];

function getKindClassification(kind: number): string {
  if (kind === 1 || kind === 2 || (kind >= 4 && kind < 45) || (kind >= 1000 && kind < 10000)) {
    return 'regular';
  }
  if (kind === 0 || kind === 3 || (kind >= 10000 && kind < 20000)) {
    return 'replaceable';
  }
  if (kind >= 20000 && kind < 30000) {
    return 'ephemeral';
  }
  if (kind >= 30000 && kind < 40000) {
    return 'addressable';
  }
  return 'regular';
}

export function getKindsForNip(nipId: string): number[] {
  const normalizedNip = normalizeNipId(nipId);
  const kinds: number[] = [];

  for (const [kindStr, entry] of Object.entries(KIND_MAP)) {
    const entryNip = normalizeNipId(entry.nip);
    if (entryNip === normalizedNip) {
      kinds.push(parseInt(kindStr));
    }
  }

  for (const range of KIND_RANGES) {
    const rangeNip = normalizeNipId(range.nip);
    if (rangeNip === normalizedNip) {
      for (let i = range.min; i <= range.max; i++) {
        if (!kinds.includes(i)) {
          kinds.push(i);
        }
      }
    }
  }

  return kinds.sort((a, b) => a - b);
}

export function getKindInfo(kind: number): KindInfo {
  const classification = getKindClassification(kind);

  const direct = KIND_MAP[kind];
  if (direct) {
    return { ...direct, classification };
  }

  const range = KIND_RANGES.find(r => kind >= r.min && kind <= r.max);
  if (range) {
    return {
      nip: range.nip,
      description: range.description,
      link: range.link,
      classification,
    };
  }

  return {
    nip: '',
    description: 'Unknown kind',
    link: '',
    classification,
  };
}
