import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Copy,
  Check,
  Plus,
  Minus,
  ArrowRight,
  Receipt,
  Scale,
  Calculator,
  ChevronDown,
  ChevronUp,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import { ScannedRecord } from '../types.ts';
import { playCashierBeep } from '../utils/sampleProduce.ts';

interface RegisterSlipProps {
  records: ScannedRecord[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveRecord: (id: string) => void;
  onClearSlip: () => void;
  onSwitchToScanner: () => void;
  onExportToSheets?: () => void;
}

// Typical default price per kg estimates for loose produce
const DEFAULT_PRICES_PER_KG: Record<string, number> = {
  '30': 0.89, // Bananas
  '26': 1.65, // Red Apples
  '143': 1.45, // Cooking Apples
  '95': 0.79, // Baking Potatoes
  '24': 1.15, // Sweet Potatoes
  '342': 0.65, // Carrots
  '53': 2.20, // Yellow Pepper
  '83': 2.20, // Red Pepper
  '58': 2.45, // Eggplant
  '68': 1.85, // Courgette
  '44': 1.75, // Galia Melon
  '147': 0.99, // Watermelon
  '62': 9.99, // Cashews
  '67': 8.99, // Almonds
  '69': 10.99, // Pistachios
};

export const RegisterSlip: React.FC<RegisterSlipProps> = ({
  records,
  onUpdateQuantity,
  onRemoveRecord,
  onClearSlip,
  onSwitchToScanner,
  onExportToSheets,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showScaleTool, setShowScaleTool] = useState(true);

  // Scale Calculator State
  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => records[0]?.id || '');
  const [grossWeightKg, setGrossWeightKg] = useState<number>(1.25);
  const [tareGrams, setTareGrams] = useState<number>(10); // standard 10g bag tare
  const [pricePerKg, setPricePerKg] = useState<number>(0.89);
  const [copiedScaleLine, setCopiedScaleLine] = useState(false);

  const selectedRecord = records.find(r => r.id === selectedRecordId) || records[0];

  // Auto-set estimated price when record changes
  const handleSelectRecord = (record: ScannedRecord) => {
    setSelectedRecordId(record.id);
    if (DEFAULT_PRICES_PER_KG[record.plu]) {
      setPricePerKg(DEFAULT_PRICES_PER_KG[record.plu]);
    }
  };

  const netWeightKg = Math.max(0.01, Number((grossWeightKg - tareGrams / 1000).toFixed(3)));
  const calculatedLineTotal = Number((netWeightKg * pricePerKg).toFixed(2));

  const totalItemsCount = records.reduce((sum, item) => sum + item.quantity, 0);

  const handleCopySummary = () => {
    if (records.length === 0) return;
    const lines = records.map(r => `PLU #${r.plu} - ${r.name} (Qty: ${r.quantity})`).join('\n');
    navigator.clipboard.writeText(
      `CASHIER PRODUCE TALLY:\n${lines}\nTotal Items: ${totalItemsCount}\nScale Weight Ready`
    );
    setCopiedSummary(true);
    playCashierBeep(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyScaleLine = () => {
    if (!selectedRecord) return;
    const line = `PLU #${selectedRecord.plu} ${selectedRecord.name} | NET ${netWeightKg.toFixed(3)}kg @ £${pricePerKg.toFixed(2)}/kg = £${calculatedLineTotal.toFixed(2)}`;
    navigator.clipboard.writeText(line);
    setCopiedScaleLine(true);
    playCashierBeep(true);
    setTimeout(() => setCopiedScaleLine(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Slip Header & Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Cashier Register Slip</h2>
              <p className="text-xs text-slate-400">
                Running tally of scanned produce and bakery items for POS entry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleCopySummary}
              disabled={records.length === 0}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied POS Codes!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy POS Tally</span>
                </>
              )}
            </button>

            {records.length > 0 && onExportToSheets && (
              <button
                onClick={onExportToSheets}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition active:scale-95"
                title="Export this slip to Google Sheets sales ledger"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export to Sheets</span>
              </button>
            )}

            {records.length > 0 && (
              <button
                onClick={onClearSlip}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                Clear Slip
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Items</span>
            <span className="text-xl font-extrabold text-white font-mono">{totalItemsCount}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Unique PLUs</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">{records.length}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">POS Status</span>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ready for Checkout
            </span>
          </div>
        </div>
      </div>

      {/* POS Scale & Tare Weight Calculator Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => setShowScaleTool(!showScaleTool)}
          className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800/80 flex items-center justify-between border-b border-slate-800/80 transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Scale className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block">
                Produce Scale & Tare Weight Calculator
              </span>
              <span className="text-[10px] text-slate-400 block">
                Calculate price by weight (kg) with bag tare deductions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px] font-mono text-emerald-400 font-bold hidden sm:inline">
              Net {netWeightKg.toFixed(3)} kg = £{calculatedLineTotal.toFixed(2)}
            </span>
            {showScaleTool ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showScaleTool && (
          <div className="p-4 bg-slate-950/70 space-y-4 text-xs">
            {records.length > 0 ? (
              <div className="space-y-3">
                {/* Select produce item */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold block">
                    Select Scaled Produce Item:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {records.map(rec => {
                      const isSel = (selectedRecord?.id || '') === rec.id;
                      return (
                        <button
                          key={rec.id}
                          onClick={() => handleSelectRecord(rec)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            isSel
                              ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="font-mono">#{rec.plu}</span>
                          <span className="truncate max-w-[120px]">{rec.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weight Presets & Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Gross Weight */}
                  <div className="space-y-1.5 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Gross Weight</span>
                      <span className="font-mono text-emerald-400">{grossWeightKg.toFixed(3)} kg</span>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="30"
                      value={grossWeightKg}
                      onChange={e => setGrossWeightKg(Math.max(0.01, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                    />
                    <div className="flex items-center gap-1 pt-1">
                      {[0.25, 0.5, 1.0, 1.5].map(w => (
                        <button
                          key={w}
                          onClick={() => setGrossWeightKg(w)}
                          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition"
                        >
                          +{w}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tare Deduction */}
                  <div className="space-y-1.5 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Tare Weight</span>
                      <span className="font-mono text-amber-400">-{tareGrams}g</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setTareGrams(0)}
                        className={`py-1.5 rounded text-[10px] font-semibold transition ${
                          tareGrams === 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        0g (None)
                      </button>
                      <button
                        onClick={() => setTareGrams(5)}
                        className={`py-1.5 rounded text-[10px] font-semibold transition ${
                          tareGrams === 5 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        5g (Bag)
                      </button>
                      <button
                        onClick={() => setTareGrams(15)}
                        className={`py-1.5 rounded text-[10px] font-semibold transition ${
                          tareGrams === 15 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        15g (Paper)
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 block pt-1">
                      Deducts packaging tare from retail scale
                    </span>
                  </div>

                  {/* Price per Kg & Computed Line */}
                  <div className="space-y-1.5 bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-300 font-semibold">
                        <span>Price / kg</span>
                        <span className="font-mono text-slate-400">£/kg</span>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={pricePerKg}
                        onChange={e => setPricePerKg(Math.max(0.01, parseFloat(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none mt-1"
                      />
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Line Cost:</span>
                      <span className="font-mono text-sm font-extrabold text-emerald-400">
                        £{calculatedLineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scaled Output Banner & Copy Action */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900 border border-emerald-500/30 p-2.5 rounded-xl w-full min-w-0">
                  <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs bg-slate-950 px-2 py-0.5 rounded text-emerald-300 border border-slate-800 shrink-0">
                      PLU #{selectedRecord?.plu || '---'}
                    </span>
                    <span className="text-slate-200 font-semibold text-xs truncate max-w-[140px] sm:max-w-xs">
                      {selectedRecord?.name}
                    </span>
                    <span className="text-slate-400 text-[10px] sm:text-[11px] font-mono">
                      NET {netWeightKg.toFixed(3)}kg @ £{pricePerKg.toFixed(2)}/kg = £{calculatedLineTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyScaleLine}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-sm active:scale-95 w-full sm:w-auto"
                  >
                    {copiedScaleLine ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Scale Slip!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Scale Line</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs">
                Scan produce items first to weigh them on the register scale calculator.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Slip Items List */}
      {records.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">Register slip is empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Scan produce or bakery items using the camera, or pick from the catalog to tally them here.
          </p>
          <button
            onClick={onSwitchToScanner}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
          >
            <span>Open Produce Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg divide-y divide-slate-800/80">
          {records.map(record => (
            <div
              key={record.id}
              className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3">
                {(record.referenceImage || record.imageThumbnail) && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                    <img
                      src={record.referenceImage || record.imageThumbnail}
                      alt={record.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className="font-mono text-base sm:text-lg font-black text-emerald-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  #{record.plu}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">{record.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="uppercase font-semibold text-slate-500">{record.category}</span>
                    <span>•</span>
                    <span>Scanned at {record.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Controls & Delete */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => onUpdateQuantity(record.id, -1)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Decrease Quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-xs text-white">
                    {record.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(record.id, 1)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Increase Quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onRemoveRecord(record.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 transition"
                  title="Remove from slip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
