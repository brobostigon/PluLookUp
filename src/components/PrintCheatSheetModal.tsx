import React, { useState, useMemo } from 'react';
import { Printer, Download, Copy, Check, Filter, X, Tag, Sparkles } from 'lucide-react';
import { PLUItem, PLUCategory } from '../types.ts';
import { playCashierBeep } from '../utils/sampleProduce.ts';

interface PrintCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PLUItem[];
}

export const PrintCheatSheetModal: React.FC<PrintCheatSheetModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterMode, setFilterMode] = useState<'all' | 'top30'>('all');
  const [includeImages, setIncludeImages] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Top 30 most frequent Lidl UK cashier items
  const TOP_PLU_NUMBERS = [
    '30', '6', '26', '365', '27', '125', '70', '81', '33', '42', '239', '43', '44', '45',
    '147', '53', '83', '58', '68', '82', '143', '371', '335', '342', '363', '95', '24', '62', '67', '69'
  ];

  const filteredItems = useMemo(() => {
    let pool = items.filter(i => i.active);
    if (filterMode === 'top30') {
      pool = pool.filter(i => TOP_PLU_NUMBERS.includes(i.plu));
    }
    if (selectedCategory !== 'All') {
      pool = pool.filter(i => i.category === selectedCategory);
    }
    // Sort numerically by PLU
    return [...pool].sort((a, b) => {
      const numA = Number(a.plu);
      const numB = Number(b.plu);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.plu.localeCompare(b.plu);
    });
  }, [items, selectedCategory, filterMode]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<PLUCategory, PLUItem[]> = {
      Produce: [],
      Bakery: [],
      Nuts: [],
      Other: [],
    };
    filteredItems.forEach(item => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      } else {
        groups['Other'].push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTextSheet = () => {
    const lines = filteredItems.map(
      i => `PLU #${i.plu.padEnd(5, ' ')} | ${i.name.padEnd(30, ' ')} | [${i.category}]`
    );
    const content = `LIDL UK CASHIER PLU QUICK REFERENCE SHEET\nGenerated: ${new Date().toLocaleDateString()}\nTotal Items: ${filteredItems.length}\n${'='.repeat(60)}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(content);
    setCopiedText(true);
    playCashierBeep(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadCSV = () => {
    const header = 'PLU,Name,Category,Visual Description\n';
    const rows = filteredItems
      .map(
        i =>
          `"${i.plu}","${i.name.replace(/"/g, '""')}","${i.category}","${(i.visualDescription || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lidl_UK_PLU_Cheat_Sheet_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    playCashierBeep(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      {/* Printable Sheet Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-3.5 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 my-2 sm:my-6 relative max-h-[94vh] flex flex-col">
        {/* Modal Header & Actions (Hidden during browser print) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5 sm:gap-2">
                <span className="truncate">Cashier Quick Cheat Sheet</span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  {filteredItems.length} PLUs
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Laminated reference guide for checkout counters & cash drawers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrint}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print<span className="hidden xs:inline"> Sheet</span></span>
            </button>

            <button
              onClick={handleCopyTextSheet}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy<span className="hidden xs:inline"> List</span></span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              title="Download as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition ml-auto sm:ml-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs print:hidden bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Scope:</span>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('top30')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filterMode === 'top30'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Top 30 Cashier Bestsellers
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Category:</span>
            {['All', 'Produce', 'Bakery', 'Nuts'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-slate-200 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={e => setIncludeImages(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span className="text-[11px]">Include Photo Thumbnails</span>
          </label>
        </div>

        {/* The Printable Layout Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 print:p-0 print:overflow-visible">
          {/* Print Sheet Header Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1 print:border-black print:text-black print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 print:border-black">
              <span className="font-mono text-xs font-bold text-emerald-400 print:text-black">
                LIDL UK RETAIL CHECKOUT REFERENCE
              </span>
              <span className="text-[10px] text-slate-400 print:text-black">
                Lanes 1–8 Quick Guide • Updated {new Date().toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-lg font-black text-white tracking-wider uppercase print:text-black">
              LIDL PRODUCE & BAKERY PLU DIRECTORY
            </h2>
            <p className="text-[11px] text-slate-400 print:text-black">
              Keep this card beside scanner scale. Enter exact PLU code on POS touchscreen.
            </p>
          </div>

          {/* Grouped Category Sections */}
          {(['Produce', 'Bakery', 'Nuts'] as PLUCategory[]).map(category => {
            const list = groupedByCategory[category];
            if (!list || list.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 border-b-2 border-slate-700 pb-1.5 print:border-black">
                  <span className="font-extrabold text-sm uppercase tracking-wider text-emerald-400 print:text-black">
                    {category} Items ({list.length})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1.5">
                  {list.map(item => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 print:border-black print:bg-white print:text-black shadow-sm"
                    >
                      {includeImages && (
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden print:border-gray-300">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Tag className="w-4 h-4 text-slate-600 print:text-black" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-sm sm:text-base font-black text-emerald-400 print:text-black bg-slate-900 print:bg-gray-100 px-1.5 py-0.2 rounded border border-slate-800 print:border-black">
                            #{item.plu}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-100 print:text-black block truncate leading-tight mt-0.5">
                          {item.name}
                        </span>
                        {item.visualDescription && (
                          <span className="text-[10px] text-slate-400 print:text-gray-700 block truncate leading-tight">
                            {item.visualDescription}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
