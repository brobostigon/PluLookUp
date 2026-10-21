// Pre-rendered sample produce items for instant testing without webcam
export interface SampleProduce {
  id: string;
  name: string;
  expectedPlu: string;
  category: string;
  emoji: string;
  thumbnailUrl: string;
  generateImage: () => string; // Returns data URL (image/png or image/jpeg)
}

function createProduceDataUrl(svgString: string): string {
  // Convert SVG to data URL
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export const SAMPLE_PRODUCE: SampleProduce[] = [
  {
    id: 'bananas',
    name: 'Bananas',
    expectedPlu: '30',
    category: 'Produce',
    emoji: '🍌',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="340" rx="140" ry="25" fill="#e2e8f0"/>
        <g transform="translate(40, 20)">
          <!-- Banana bunch -->
          <path d="M120 70 C140 160 210 270 320 280 C290 285 200 280 140 180 C110 130 100 80 120 70 Z" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
          <path d="M140 60 C160 160 230 260 335 250 C310 260 220 270 150 170 C125 120 120 70 140 60 Z" fill="#fde047" stroke="#eab308" stroke-width="3"/>
          <path d="M90 85 C110 170 180 275 285 295 C255 295 170 285 110 190 C85 140 80 95 90 85 Z" fill="#eab308" stroke="#ca8a04" stroke-width="4"/>
          <!-- Crown stem -->
          <path d="M90 85 L140 60 L145 40 L105 45 Z" fill="#4d7c0f" stroke="#365314" stroke-width="2"/>
          <!-- Brown tips -->
          <circle cx="320" cy="280" r="6" fill="#713f12"/>
          <circle cx="335" cy="250" r="5" fill="#713f12"/>
          <circle cx="285" cy="295" r="5" fill="#713f12"/>
          <!-- Banana speckles -->
          <ellipse cx="180" cy="190" rx="2" ry="4" fill="#854d0e" opacity="0.6"/>
          <ellipse cx="220" cy="220" rx="2" ry="3" fill="#854d0e" opacity="0.6"/>
          <ellipse cx="160" cy="150" rx="1.5" ry="3" fill="#854d0e" opacity="0.6"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Loose Fresh Bananas</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'avocado',
    name: 'Medium Avocado',
    expectedPlu: '365',
    category: 'Produce',
    emoji: '🥑',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="340" rx="120" ry="25" fill="#e2e8f0"/>
        <g transform="translate(100, 50)">
          <!-- Avocado skin pear-shape -->
          <path d="M100 20 C140 20 185 80 190 170 C195 240 155 280 100 280 C45 280 5 240 10 170 C15 80 60 20 100 20 Z" fill="#1e293b" stroke="#0f172a" stroke-width="5"/>
          <!-- Pebbled skin texture -->
          <circle cx="50" cy="180" r="4" fill="#334155" opacity="0.8"/>
          <circle cx="80" cy="140" r="5" fill="#334155" opacity="0.8"/>
          <circle cx="120" cy="210" r="4" fill="#334155" opacity="0.8"/>
          <circle cx="150" cy="170" r="5" fill="#334155" opacity="0.8"/>
          <circle cx="90" cy="80" r="4" fill="#334155" opacity="0.8"/>
          <circle cx="120" cy="100" r="4" fill="#334155" opacity="0.8"/>
          <!-- Cut half in foreground -->
          <path d="M100 40 C130 40 170 90 175 160 C180 220 145 260 100 260 C55 260 20 220 25 160 C30 90 70 40 100 40 Z" fill="#14532d" stroke="#166534" stroke-width="3"/>
          <path d="M100 50 C125 50 160 95 165 160 C170 215 140 250 100 250 C60 250 30 215 35 160 C40 95 75 50 100 50 Z" fill="#84cc16"/>
          <path d="M100 65 C120 65 145 105 150 160 C155 205 130 235 100 235 C70 235 45 205 50 160 C55 105 80 65 100 65 Z" fill="#bef264"/>
          <!-- Big round stone -->
          <circle cx="100" cy="175" r="42" fill="#78350f" stroke="#451a03" stroke-width="3"/>
          <circle cx="115" cy="160" r="10" fill="#92400e" opacity="0.6"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Medium Hass Avocado</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'tiger_loaf',
    name: 'Tiger Loaf',
    expectedPlu: '27',
    category: 'Bakery',
    emoji: '🍞',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="330" rx="150" ry="30" fill="#e2e8f0"/>
        <g transform="translate(60, 110)">
          <!-- Bloomer loaf body -->
          <ellipse cx="140" cy="110" rx="140" ry="75" fill="#d97706" stroke="#92400e" stroke-width="4"/>
          <!-- Cracked mottled rice paste crust -->
          <path d="M40 90 Q 70 70 95 100 Q 120 130 150 90 Q 190 70 220 110" stroke="#78350f" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M60 120 Q 90 140 120 120 Q 160 140 200 120 Q 230 140 250 110" stroke="#78350f" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M80 60 Q 110 80 140 60 Q 180 80 210 60" stroke="#78350f" stroke-width="5" fill="none" stroke-linecap="round"/>
          <!-- Cracked mosaic patches -->
          <rect x="70" y="75" width="25" height="18" rx="4" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
          <rect x="115" y="65" width="30" height="20" rx="5" fill="#fef08a" stroke="#92400e" stroke-width="2"/>
          <rect x="165" y="70" width="28" height="18" rx="4" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
          <rect x="90" y="105" width="28" height="22" rx="5" fill="#fef08a" stroke="#92400e" stroke-width="2"/>
          <rect x="135" y="100" width="35" height="24" rx="6" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
          <rect x="185" y="105" width="30" height="20" rx="5" fill="#fef08a" stroke="#92400e" stroke-width="2"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Lidl Bakery Tiger Loaf</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    expectedPlu: '6',
    category: 'Produce',
    emoji: '🥒',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="330" rx="150" ry="25" fill="#e2e8f0"/>
        <g transform="translate(60, 110) rotate(-18, 140, 60)">
          <!-- Dark green cylinder body -->
          <rect x="20" y="40" width="240" height="65" rx="32" fill="#15803d" stroke="#14532d" stroke-width="4"/>
          <!-- Subtle ribbed highlights -->
          <line x1="45" y1="55" x2="235" y2="55" stroke="#22c55e" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
          <line x1="50" y1="72" x2="230" y2="72" stroke="#4ade80" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
          <line x1="45" y1="90" x2="235" y2="90" stroke="#166534" stroke-width="4" stroke-linecap="round"/>
          <!-- Tiny bumps/prickles -->
          <circle cx="80" cy="50" r="2" fill="#86efac"/>
          <circle cx="120" cy="65" r="2" fill="#86efac"/>
          <circle cx="160" cy="52" r="2" fill="#86efac"/>
          <circle cx="200" cy="68" r="2" fill="#86efac"/>
          <!-- Stem end -->
          <rect x="250" y="65" width="16" height="14" rx="3" fill="#3f6212"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Standard Unwrapped Cucumber</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'red_apples',
    name: 'Red Apples',
    expectedPlu: '26',
    category: 'Produce',
    emoji: '🍎',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="335" rx="120" ry="25" fill="#e2e8f0"/>
        <g transform="translate(110, 80)">
          <!-- Glossy red apple body -->
          <path d="M90 40 C130 10 180 50 180 120 C180 190 130 220 90 220 C50 220 0 190 0 120 C0 50 50 10 90 40 Z" fill="#dc2626" stroke="#991b1b" stroke-width="4"/>
          <!-- Yellow-green blush -->
          <path d="M40 70 C70 40 85 80 80 130 C75 180 40 180 30 140 Z" fill="#facc15" opacity="0.45"/>
          <!-- Gloss shine -->
          <ellipse cx="140" cy="85" rx="14" ry="26" transform="rotate(25, 140, 85)" fill="#ffffff" opacity="0.45"/>
          <!-- Stem -->
          <path d="M90 40 Q 95 10 115 0" stroke="#78350f" stroke-width="6" fill="none" stroke-linecap="round"/>
          <!-- Green leaf -->
          <path d="M100 25 Q 130 10 140 25 Q 130 40 100 25" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Loose Glossy Red Eating Apple</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'persimmon',
    name: 'Persimmon / Sharon Fruit',
    expectedPlu: '82',
    category: 'Produce',
    emoji: '🟠',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="330" rx="120" ry="25" fill="#e2e8f0"/>
        <g transform="translate(100, 90)">
          <!-- Bright orange rounded squat shape -->
          <ellipse cx="100" cy="120" rx="95" ry="85" fill="#ea580c" stroke="#c2410c" stroke-width="4"/>
          <ellipse cx="100" cy="110" rx="80" ry="70" fill="#f97316"/>
          <!-- Four-lobed green/brown calyx crown on top -->
          <path d="M100 45 L80 20 L95 40 L65 35 L90 50 L85 65 L100 55 L115 65 L110 50 L135 35 L105 40 L120 20 Z" fill="#65a30d" stroke="#3f6212" stroke-width="2"/>
          <circle cx="100" cy="45" r="7" fill="#4d7c0f"/>
          <!-- Gloss highlight -->
          <ellipse cx="140" cy="95" rx="15" ry="25" transform="rotate(30, 140, 95)" fill="#ffffff" opacity="0.4"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Glossy Bright Orange Persimmon</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'pretzel',
    name: 'Pretzel',
    expectedPlu: '125',
    category: 'Bakery',
    emoji: '🥨',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="340" rx="130" ry="25" fill="#e2e8f0"/>
        <g transform="translate(70, 70)">
          <!-- Dark mahogany lye pretzel knot -->
          <path d="M130 190 C60 190 20 130 30 70 C40 10 110 20 130 90 C150 20 220 10 230 70 C240 130 200 190 130 190 Z" fill="#78350f" stroke="#451a03" stroke-width="8"/>
          <!-- Inner holes -->
          <ellipse cx="75" cy="80" rx="30" ry="35" fill="#f8fafc" stroke="#451a03" stroke-width="6"/>
          <ellipse cx="185" cy="80" rx="30" ry="35" fill="#f8fafc" stroke="#451a03" stroke-width="6"/>
          <ellipse cx="130" cy="140" rx="25" ry="20" fill="#f8fafc" stroke="#451a03" stroke-width="6"/>
          <!-- Golden browned shine -->
          <path d="M60 185 C95 195 165 195 200 185" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>
          <!-- Coarse white sea salt crystals -->
          <rect x="70" y="170" width="6" height="6" fill="#ffffff" transform="rotate(20 70 170)"/>
          <rect x="110" y="180" width="6" height="6" fill="#ffffff" transform="rotate(45 110 180)"/>
          <rect x="150" y="180" width="7" height="7" fill="#ffffff" transform="rotate(10 150 180)"/>
          <rect x="180" y="170" width="6" height="6" fill="#ffffff" transform="rotate(30 180 170)"/>
          <rect x="40" y="100" width="6" height="6" fill="#ffffff"/>
          <rect x="215" y="100" width="6" height="6" fill="#ffffff"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Dark Mahogany Salted Pretzel</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
  {
    id: 'aubergine',
    name: 'Aubergine',
    expectedPlu: '58',
    category: 'Produce',
    emoji: '🍆',
    thumbnailUrl: '',
    generateImage: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <ellipse cx="200" cy="335" rx="130" ry="25" fill="#e2e8f0"/>
        <g transform="translate(100, 70)">
          <!-- Deep purple teardrop -->
          <path d="M90 60 C120 60 150 110 155 170 C160 220 130 250 90 250 C50 250 20 220 25 170 C30 110 60 60 90 60 Z" fill="#3b0764" stroke="#2e1065" stroke-width="4"/>
          <!-- High gloss shine -->
          <ellipse cx="120" cy="160" rx="15" ry="40" transform="rotate(20 120 160)" fill="#ffffff" opacity="0.35"/>
          <!-- Green calyx cap -->
          <path d="M90 60 L75 30 L85 55 L60 45 L80 65 L65 80 L90 70 L110 80 L100 65 L120 45 L95 55 L105 30 Z" fill="#15803d" stroke="#166534" stroke-width="2"/>
          <path d="M90 30 Q 95 10 100 0" stroke="#14532d" stroke-width="6" fill="none" stroke-linecap="round"/>
        </g>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748b" text-anchor="middle">Glossy Deep Purple Aubergine</text>
      </svg>`;
      return createProduceDataUrl(svg);
    },
  },
];

// Helper to play cashier beep sound using AudioContext
export function playCashierBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = success ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(success ? 1760 : 440, ctx.currentTime); // High pitch supermarket scan beep
    if (success) {
      osc.frequency.setValueAtTime(2200, ctx.currentTime + 0.06);
    }

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.17);
  } catch (_) {}
}

// Helper to speak PLU code aloud for cashiers
export function speakPluCode(plu: string, name: string) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    // Spell out digits clearly: e.g. "30" -> "three zero"
    const digits = plu.split('').join(' ');
    const utterance = new SpeechSynthesisUtterance(`PLU ${digits}. ${name}`);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}
