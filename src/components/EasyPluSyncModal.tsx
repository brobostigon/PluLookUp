import React, { useState, useMemo } from 'react';
import {
  Globe,
  ExternalLink,
  ClipboardPaste,
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ArrowRight,
  Database
} from 'lucide-react';
import { PLUItem, PLUCategory } from '../types.ts';

interface EasyPluSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncEasyPlu: (payload: {
    items?: Partial<PLUItem>[];
    mode?: 'merge' | 'replace';
    easyPluToken?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string; count?: number }>;
  currentItems: PLUItem[];
}

// Preset easyPLU Lidl retail standardized dataset
const EASY_PLU_LIDL_PRESET: Partial<PLUItem>[] = [
  { plu: '30', name: 'Bananen / Bananas', category: 'Produce', visualDescription: 'Loose yellow bananas with green-brown crown stem' },
  { plu: '6', name: 'Schlangengurke / Cucumber', category: 'Produce', visualDescription: 'Unwrapped dark green cucumber cylinder' },
  { plu: '26', name: 'Rote Äpfel / Red Apples', category: 'Produce', visualDescription: 'Glossy red eating apples, loose' },
  { plu: '143', name: 'Bramley Kochäpfel / Cooking Apples', category: 'Produce', visualDescription: 'Large broad green cooking apples' },
  { plu: '365', name: 'Avocado Hass Medium', category: 'Produce', visualDescription: 'Pebbled dark green/black pear shape standard size' },
  { plu: '366', name: 'Avocado Hass Groß / Large', category: 'Produce', visualDescription: 'Pebbled dark green/black pear shape extra large size' },
  { plu: '27', name: 'Tigerbrot / Tiger Loaf', category: 'Bakery', visualDescription: 'Bloomer loaf with mottled cracked rice paste crust' },
  { plu: '125', name: 'Laugenbrezel / Salted Pretzel', category: 'Bakery', visualDescription: 'Dark mahogany lye pretzel knot with coarse white salt crystals' },
  { plu: '70', name: 'Buttercroissant / All Butter Croissant', category: 'Bakery', visualDescription: 'Plain golden flaky curved crescent pastry' },
  { plu: '81', name: 'Schokobrötchen / Pain au Chocolat', category: 'Bakery', visualDescription: 'Rectangular flaky pastry with dark chocolate bars' },
  { plu: '33', name: 'Krustensemmel / White Crusty Roll', category: 'Bakery', visualDescription: 'Round crisp golden floured white crusty roll' },
  { plu: '42', name: 'Käsebrötchen / Cheese Roll', category: 'Bakery', visualDescription: 'Roll topped with baked browned cheddar crust' },
  { plu: '239', name: 'Ciabatta Brötchen / Ciabatta Roll', category: 'Bakery', visualDescription: 'Rectangular slipper-shaped Italian roll with flour dust' },
  { plu: '43', name: 'Mango', category: 'Produce', visualDescription: 'Oval stone fruit with green-yellow-red skin' },
  { plu: '44', name: 'Galia Melone / Galia Melon', category: 'Produce', visualDescription: 'Round golden-yellow melon with fine netted rind' },
  { plu: '45', name: 'Honigmelone / Honeydew Melon', category: 'Produce', visualDescription: 'Smooth bright canary-yellow oval melon' },
  { plu: '147', name: 'Wassermelone / Watermelon', category: 'Produce', visualDescription: 'Large dark green melon with light green stripes' },
  { plu: '53', name: 'Gelbe Paprika / Yellow Pepper', category: 'Produce', visualDescription: 'Loose blocky glossy yellow bell pepper' },
  { plu: '83', name: 'Rote Paprika / Red Pepper', category: 'Produce', visualDescription: 'Loose blocky glossy red bell pepper' },
  { plu: '58', name: 'Aubergine / Eggplant', category: 'Produce', visualDescription: 'Glossy deep purple teardrop vegetable with green calyx' },
  { plu: '68', name: 'Zucchini / Courgette', category: 'Produce', visualDescription: 'Slender dark green cylinder with stem cap' },
  { plu: '82', name: 'Kaki / Persimmon Sharon Fruit', category: 'Produce', visualDescription: 'Glossy bright orange tomato-shaped fruit' },
  { plu: '2', name: 'Feigen / Figs', category: 'Produce', visualDescription: 'Small dark purple teardrop fresh fruit' },
  { plu: '5', name: 'Kirschen / Cherries', category: 'Produce', visualDescription: 'Loose dark red cherries on stems' },
  { plu: '11', name: 'Limetten / Limes', category: 'Produce', visualDescription: 'Small bright green oval citrus' },
  { plu: '371', name: 'Zitronen / Lemons', category: 'Produce', visualDescription: 'Loose bright yellow oval citrus with pointed ends' },
  { plu: '335', name: 'Knoblauch / Garlic', category: 'Produce', visualDescription: 'Loose white papery garlic bulb' },
  { plu: '342', name: 'Möhren / Loose Carrots', category: 'Produce', visualDescription: 'Loose orange tapered root carrots' },
  { plu: '363', name: 'Blumenkohl / Cauliflower', category: 'Produce', visualDescription: 'White floret head surrounded by green leaves' },
  { plu: '95', name: 'Backkartoffeln / Baking Potatoes', category: 'Produce', visualDescription: 'Large loose buff-skinned russet potatoes' },
  { plu: '24', name: 'Süßkartoffeln / Sweet Potatoes', category: 'Produce', visualDescription: 'Loose copper-skinned tapered tuber' },
  { plu: '62', name: 'Cashewkerne / Cashews', category: 'Nuts', visualDescription: 'Kidney-shaped pale creamy nut' },
  { plu: '67', name: 'Mandeln / Almonds', category: 'Nuts', visualDescription: 'Teardrop brown nut with grooved skin' },
  { plu: '69', name: 'Pistazien / Pistachios', category: 'Nuts', visualDescription: 'Split beige shell showing green nut' },
];

export const EasyPluSyncModal: React.FC<EasyPluSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncEasyPlu,
  currentItems,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'preset' | 'token'>('paste');
  const [rawText, setRawText] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Parse pasted content from easyPLU
  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results: Partial<PLUItem>[] = [];

    // Try parsing as JSON first
    if (rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
      try {
        const json = JSON.parse(rawText.trim());
        const list = Array.isArray(json) ? json : json.data || json.products || [];
        for (const item of list) {
          const plu = String(item.plu || item.plu_number || item.number || '').trim();
          const name = String(item.name || item.title || '').trim();
          if (plu && name) {
            results.push({
              plu,
              name,
              category: (item.category || item.product_group || 'Produce') as PLUCategory,
              visualDescription: item.description || item.visualDescription || '',
              imageUrl: item.imageUrl || item.image || undefined,
            });
          }
        }
        if (results.length > 0) return results;
      } catch (_) {}
    }

    // Parse tabular, free-form, or HTML format from easyPLU website
    for (const rawLine of lines) {
      // Check for image URL in the line if present
      const imgMatch = rawLine.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|svg)/i);
      const imageUrl = imgMatch ? imgMatch[0] : undefined;

      // Clean HTML tags if present
      const cleanLine = rawLine.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      if (!cleanLine) continue;

      let plu = '';
      let name = '';
      let category: PLUCategory = 'Produce';
      let visualDescription = '';

      // Check category keywords
      const lower = cleanLine.toLowerCase();
      if (lower.includes('back') || lower.includes('brot') || lower.includes('semmel') || lower.includes('croissant') || lower.includes('bakery')) {
        category = 'Bakery';
      } else if (lower.includes('nuss') || lower.includes('nüsse') || lower.includes('nut') || lower.includes('mandel') || lower.includes('pistaz')) {
        category = 'Nuts';
      } else if (lower.includes('obst') || lower.includes('gemüse') || lower.includes('produce')) {
        category = 'Produce';
      }

      // Try matching patterns:
      // Pattern 1: Starts with PLU number (e.g. "30 Bananen" or "PLU 30 - Bananen")
      const startPluMatch = cleanLine.match(/^(?:PLU\s*[:#]?\s*)?(\d{1,5})[\s\t,;:\-]+(.+)$/i);
      // Pattern 2: Ends with PLU number (e.g. "Bananen 30" or "Bananen - PLU 30")
      const endPluMatch = cleanLine.match(/^(.+?)[\s\t,;:\-]+(?:PLU\s*[:#]?\s*)?(\d{1,5})$/i);
      // Pattern 3: Separated by tab, pipe, or multiple spaces
      const parts = cleanLine.split(/\t|\||\s{2,}/).map(p => p.trim()).filter(Boolean);

      if (startPluMatch && isNaN(Number(startPluMatch[2]))) {
        plu = startPluMatch[1];
        name = startPluMatch[2].trim();
      } else if (endPluMatch && isNaN(Number(endPluMatch[1]))) {
        name = endPluMatch[1].trim();
        plu = endPluMatch[2];
      } else if (parts.length >= 2) {
        const numPart = parts.find(p => /^\d{1,5}$/.test(p));
        const textParts = parts.filter(p => !/^\d{1,5}$/.test(p));
        if (numPart && textParts.length > 0) {
          plu = numPart;
          name = textParts[0];
          if (textParts.length > 1) {
            visualDescription = textParts.slice(1).join(', ');
          }
        }
      }

      // Clean up name
      if (plu && name) {
        name = name.replace(/^[-–—:,#\s]+|[-–—:,#\s]+$/g, '').trim();
        if (name && !results.some(r => r.plu === plu)) {
          results.push({
            plu,
            name,
            category,
            visualDescription: visualDescription || undefined,
            imageUrl,
          });
        }
      }
    }

    return results;
  }, [rawText]);

  if (!isOpen) return null;

  const handleSyncParsed = async () => {
    if (parsedItems.length === 0) {
      setFeedback({ type: 'error', message: 'No valid PLU items could be parsed from the text.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    const res = await onSyncEasyPlu({ items: parsedItems, mode: importMode });
    setIsProcessing(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || `Successfully synced ${parsedItems.length} PLU items!` });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to sync items.' });
    }
  };

  const handleSyncPreset = async () => {
    setIsProcessing(true);
    setFeedback(null);
    const res = await onSyncEasyPlu({ items: EASY_PLU_LIDL_PRESET, mode: 'merge' });
    setIsProcessing(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Applied easyPLU Lidl retail standardization to database!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to apply preset.' });
    }
  };

  const handleSyncToken = async () => {
    if (!tokenInput.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your easyPLU session bearer token.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    const res = await onSyncEasyPlu({ easyPluToken: tokenInput.trim(), mode: importMode });
    setIsProcessing(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Synced items directly from easyPLU API!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: res.error || 'easyPLU API connection failed. Check token or use the Copy-Paste tab.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-3.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 my-2 sm:my-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
              <Globe className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Sync from easyPLU
                </h3>
                <span className="text-[9px] sm:text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded shrink-0">
                  knowledge-hero
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Update store PLU numbers directly from Lidl's easyPLU portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Source link banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 min-w-0 break-all text-[11px] sm:text-xs">
            Source: <span className="text-sky-400 font-mono">easy-plu.knowledge-hero.com</span>
          </span>
          <a
            href="https://easy-plu.knowledge-hero.com/plu-nummernsuche"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition shrink-0"
          >
            <span>Open Portal</span>
            <ExternalLink className="w-3 h-3 text-sky-400" />
          </a>
        </div>

        {/* Sync Mode Navigation Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'paste'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Smart Copy-Paste</span>
          </button>
          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'preset'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>easyPLU Lidl Standard</span>
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'token'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Token</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: Smart Copy-Paste Parser */}
        {activeTab === 'paste' && (
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Paste content or table from easyPLU
                </label>
                <span className="text-[10px] text-slate-400">
                  Accepts table rows, TSV, CSV, or text
                </span>
              </div>
              <textarea
                rows={5}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Example:
30	Bananen	Obst/Gemüse	Gelbe lose Bananen
6	Gurken	Obst/Gemüse	Frische Schlangengurke
125	Laugenbrezel	Backwaren	Mit Hagelsalz
27	Tigerbrot	Backwaren	Knuspriges Krustenbrot"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-white font-mono text-xs outline-none"
              />
            </div>

            {/* Parsed Items Preview */}
            {parsedItems.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-xs">
                    ✓ Detected {parsedItems.length} PLU items ready to import
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-emerald-500"
                      />
                      <span>Merge (Update & Add)</span>
                    </label>
                    <label className="text-[11px] text-slate-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-emerald-500"
                      />
                      <span>Replace All</span>
                    </label>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {parsedItems.slice(0, 10).map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                          #{it.plu}
                        </span>
                        <span className="text-slate-200 font-medium truncate">{it.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold shrink-0">
                        {it.category}
                      </span>
                    </div>
                  ))}
                  {parsedItems.length > 10 && (
                    <p className="text-[10px] text-slate-500 text-center pt-1">
                      ...and {parsedItems.length - 10} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSyncParsed}
              disabled={isProcessing || parsedItems.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing with Database...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Import & Sync {parsedItems.length > 0 ? `${parsedItems.length} Items` : ''}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Standard easyPLU Lidl Preset */}
        {activeTab === 'preset' && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>easyPLU Lidl Retail Nomenclature Standards</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Enriches and standardizes your active database with easyPLU's verified bilingual naming (German/English), exact Lidl PLU numbers, and cashier visual cues (e.g. <span className="text-slate-200">#30 Bananen / Bananas, #6 Schlangengurke, #365 Avocado Hass, #125 Laugenbrezel</span>).
              </p>
              <div className="pt-1 flex items-center gap-3 text-slate-500 text-[10px]">
                <span>• 34 Verified easyPLU items</span>
                <span>• Fast 1-click update</span>
                <span>• Preserves existing unique items</span>
              </div>
            </div>

            <button
              onClick={handleSyncPreset}
              disabled={isProcessing}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Applying easyPLU Standards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Apply easyPLU Lidl Standards Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: easyPLU API Session Token */}
        {activeTab === 'token' && (
          <div className="space-y-3.5 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                <span>Where to find your easyPLU Token</span>
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                easyPLU stores your active authentication token in your browser's <code className="text-emerald-400 font-mono">localStorage</code> under the key <code className="text-sky-300 font-mono">"authToken"</code>.
              </p>
            </div>

            {/* Step-by-Step Guide */}
            <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 text-[11px]">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block">
                Quick 10-Second Guide:
              </span>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-300">
                    Open your logged-in tab at{' '}
                    <a
                      href="https://easy-plu.knowledge-hero.com/plu-nummernsuche"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline font-medium"
                    >
                      easy-plu.knowledge-hero.com
                    </a>
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-slate-300">
                      Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 font-mono text-[10px]">F12</kbd> (or Right-Click $\rightarrow$ <strong>Inspect</strong>), click the <strong>Console</strong> tab, and run this universal token finder snippet:
                    </p>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-[10px] text-emerald-400">
                      <span className="truncate flex-1 select-all">
                        copy(Object.entries(localStorage).find(([k])=&gt;/token|auth|jwt/i.test(k))?.[1] || document.cookie)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("copy(Object.entries(localStorage).find(([k])=>/token|auth|jwt/i.test(k))?.[1] || document.cookie)");
                          setFeedback({ type: 'success', message: 'Copied universal snippet! Paste it in the easyPLU console and press Enter.' });
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold shrink-0 transition"
                      >
                        Copy Snippet
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 space-y-1">
                      <span className="font-bold block">Why did "authToken" show as undefined?</span>
                      <p className="text-slate-400 leading-normal">
                        If you're not logged into an active account on easy-plu, or if the website uses cookies, session storage, or a different key name, it will return <code className="text-amber-300 font-mono">undefined</code>.
                        You can also check <strong>Inspect &gt; Network tab</strong>, click any request, and check <strong>Request Headers &gt; Authorization</strong>.
                      </p>
                      <p className="text-emerald-400 font-semibold">
                        💡 Tip: You don't need a token at all! Switch to the "Copy & Paste" tab above or click "Preset Standards" for 1-click sync!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-300">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200 font-mono text-[10px]">Enter</kbd> (your token is copied to your clipboard), then paste it in the field below:
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">
                Paste easyPLU Token
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Paste token here (e.g. eyJ0eXAiOiJKV1QiLC...)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
              />
            </div>

            <button
              onClick={handleSyncToken}
              disabled={isProcessing || !tokenInput.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-400 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Querying easyPLU API...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Fetch & Sync Live easyPLU Database</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
