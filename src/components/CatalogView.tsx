import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Copy,
  Check,
  Volume2,
  Plus,
  Filter,
  Tag,
  Info,
  Mic,
  MicOff,
  Printer,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { PLUItem, PLUCategory, ScannedRecord } from '../types.ts';
import { speakPluCode, playCashierBeep } from '../utils/sampleProduce.ts';

interface CatalogViewProps {
  items: PLUItem[];
  onAddToSlip: (item: ScannedRecord) => void;
  onOpenCheatSheet: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  items,
  onAddToSlip,
  onOpenCheatSheet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'plu' | 'name' | 'category'>('plu');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const categories = ['All', 'Produce', 'Bakery', 'Nuts'];

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-GB';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening... Say produce name (e.g. "Bananas", "Cucumber")');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setIsListening(false);
        setVoiceNotice(`Heard: "${transcript}"`);
        setSearchQuery(transcript);

        // Auto-match and announce if strong match
        const lower = transcript.toLowerCase();
        const found = items.find(
          i =>
            i.name.toLowerCase().includes(lower) ||
            lower.includes(i.name.toLowerCase().split(' ')[0]) ||
            i.plu === transcript
        );

        if (found) {
          playCashierBeep(true);
          speakPluCode(found.plu, found.name);
          setVoiceNotice(`Matched: PLU #${found.plu} (${found.name})`);
        } else {
          playCashierBeep(false);
        }

        setTimeout(() => setVoiceNotice(null), 3500);
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        setVoiceNotice('Voice recognition unavailable or mic permission denied.');
        setTimeout(() => setVoiceNotice(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [items]);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setVoiceNotice('Voice search not supported in this browser.');
      setTimeout(() => setVoiceNotice(null), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        recognitionRef.current.stop();
      }
    }
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchesPlu = item.plu.toLowerCase().includes(q);
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesDesc = item.visualDescription?.toLowerCase().includes(q);

      return matchesPlu || matchesName || matchesDesc;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'plu') {
        const numA = Number(a.plu);
        const numB = Number(b.plu);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.plu.localeCompare(b.plu);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.category.localeCompare(b.category);
      }
    });
  }, [items, searchQuery, selectedCategory, sortBy]);

  const handleCopy = (plu: string, id: string) => {
    navigator.clipboard.writeText(plu);
    setCopiedId(id);
    playCashierBeep(true);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAdd = (item: PLUItem) => {
    onAddToSlip({
      id: `${item.plu}-${Date.now()}`,
      plu: item.plu,
      name: item.name,
      category: item.category,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 100,
      quantity: 1,
      referenceImage: item.imageUrl,
    });
    playCashierBeep(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by PLU (e.g. 30), name, or speak aloud..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Voice Search Button */}
          <button
            onClick={toggleVoiceSearch}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition active:scale-95 ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Search by Voice (Say produce name)"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Print Cheat Sheet Button */}
          <button
            onClick={onOpenCheatSheet}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            title="Open printable 1-page cashier cheat sheet"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Cheat Sheet</span>
          </button>
        </div>

        {/* Voice Feedback Banner */}
        {voiceNotice && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{voiceNotice}</span>
          </div>
        )}

        {/* Filter Pills & Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(cat => {
              const count =
                cat === 'All' ? items.length : items.filter(i => i.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950 font-extrabold'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none"
            >
              <option value="plu">PLU Number</option>
              <option value="name">Name (A-Z)</option>
              <option value="category">Category</option>
            </select>
            <span className="text-xs text-slate-400 hidden sm:inline ml-1">
              {filteredItems.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No PLU items match "{searchQuery}"</h4>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or check the Backend DB tab to add new items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map(item => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md transition group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.category === 'Produce'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : item.category === 'Bakery'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="font-mono text-base sm:text-lg font-black text-emerald-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                      #{item.plu}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    {item.imageUrl && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 shrink-0 shadow-inner">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug">
                        {item.name}
                      </h3>
                      {item.visualDescription && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {item.visualDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => handleCopy(item.plu, item.id)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95"
                    title="Copy PLU Code"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 text-[11px]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px]">Copy PLU</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => speakPluCode(item.plu, item.name)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                    title="Speak Aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleAdd(item)}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded-lg border border-emerald-500/30 transition"
                    title="Add to Cashier Slip"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
