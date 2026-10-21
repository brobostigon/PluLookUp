import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  Trophy,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  Delete,
  CornerDownLeft,
  AlertCircle
} from 'lucide-react';
import { PLUItem, PLUCategory } from '../types.ts';
import { playCashierBeep, speakPluCode } from '../utils/sampleProduce.ts';

interface TrainingModeProps {
  items: PLUItem[];
}

export const TrainingMode: React.FC<TrainingModeProps> = ({ items }) => {
  const activeItems = useMemo(() => items.filter(i => i.active), [items]);

  const [categoryFilter, setCategoryFilter] = useState<'All' | PLUCategory>('All');
  const [currentItem, setCurrentItem] = useState<PLUItem | null>(null);
  const [enteredPlu, setEnteredPlu] = useState<string>('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [recentTimes, setRecentTimes] = useState<number[]>([]);
  const [wrongItems, setWrongItems] = useState<PLUItem[]>([]);
  const [keypadLayout, setKeypadLayout] = useState<'pos' | 'phone'>('pos');

  // Filter pool
  const eligibleItems = useMemo(() => {
    return activeItems.filter(i => categoryFilter === 'All' || i.category === categoryFilter);
  }, [activeItems, categoryFilter]);

  // Pick random next item
  const pickNextItem = useCallback((prevId?: string) => {
    if (eligibleItems.length === 0) return;
    let pool = eligibleItems;
    if (pool.length > 1 && prevId) {
      pool = pool.filter(i => i.id !== prevId);
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    setCurrentItem(pool[randomIndex]);
    setEnteredPlu('');
    setFeedback(null);
    setStartTime(Date.now());
  }, [eligibleItems]);

  useEffect(() => {
    pickNextItem();
  }, [categoryFilter, pickNextItem]);

  // Handle keyboard typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (feedback !== null) return;
      if (/^[0-9]$/.test(e.key)) {
        if (enteredPlu.length < 5) {
          setEnteredPlu(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setEnteredPlu(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleSubmitAnswer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enteredPlu, feedback, currentItem]);

  const handleSubmitAnswer = () => {
    if (!currentItem || !enteredPlu) return;

    const timeSpent = Math.max(0.4, Number(((Date.now() - startTime) / 1000).toFixed(1)));
    setTotalAttempts(prev => prev + 1);

    if (enteredPlu.trim() === currentItem.plu.trim()) {
      // Correct!
      setFeedback('correct');
      playCashierBeep(true);
      setScore(prev => prev + 10 + Math.min(streak * 2, 20));
      setCorrectAttempts(prev => prev + 1);
      setRecentTimes(prev => [timeSpent, ...prev.slice(0, 9)]);
      setStreak(prev => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });

      setTimeout(() => {
        pickNextItem(currentItem.id);
      }, 900);
    } else {
      // Wrong!
      setFeedback('wrong');
      playCashierBeep(false);
      setStreak(0);
      setWrongItems(prev => {
        if (!prev.some(w => w.id === currentItem.id)) {
          return [currentItem, ...prev];
        }
        return prev;
      });

      // Allow 1.6s to view the correct answer
      setTimeout(() => {
        pickNextItem(currentItem.id);
      }, 1800);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (feedback !== null) return;
    if (enteredPlu.length < 5) {
      setEnteredPlu(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setEnteredPlu(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setEnteredPlu('');
  };

  const avgSpeed = recentTimes.length > 0
    ? (recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length).toFixed(1)
    : '—';

  const accuracy = totalAttempts > 0
    ? Math.round((correctAttempts / totalAttempts) * 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Top Training Header & Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-3 w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Cashier Speed Training
                </h2>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                  Quiz
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Train muscle memory and recall PLU codes for faster checkout
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['All', 'Produce', 'Bakery', 'Nuts'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Training Scoreboard Ticker - 2x2 grid on mobile, 4 columns on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Score</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">{score}</span>
          </div>
          <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Streak</span>
            <div className="flex items-center justify-center gap-1 text-amber-400 font-mono font-black text-base sm:text-lg">
              <Flame className={`w-4 h-4 ${streak > 2 ? 'animate-bounce text-orange-400' : ''}`} />
              <span>{streak}</span>
            </div>
          </div>
          <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Accuracy</span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-400">{accuracy}%</span>
          </div>
          <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Speed</span>
            <span className="text-base sm:text-lg font-black font-mono text-purple-400">{avgSpeed}s</span>
          </div>
        </div>
      </div>

      {/* Main Flashcard & Interactive POS Keypad */}
      {currentItem ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flashcard Item Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
                  {currentItem.category}
                </span>
                <button
                  onClick={() => speakPluCode(currentItem.plu, currentItem.name)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Speak Item"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Produce Reference Image or Icon Box */}
              <div className="aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner mb-3">
                {currentItem.imageUrl ? (
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-5xl block mb-2">
                      {currentItem.category === 'Produce' ? '🍎' : currentItem.category === 'Bakery' ? '🥐' : '🥜'}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Lidl Store Item
                    </span>
                  </div>
                )}

                {/* Feedback Overlay Banner */}
                {feedback === 'correct' && (
                  <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 space-y-1 animate-in fade-in">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                    <span className="text-base font-black text-white">CORRECT!</span>
                    <span className="font-mono text-xl font-black text-emerald-300">
                      PLU #{currentItem.plu}
                    </span>
                  </div>
                )}

                {feedback === 'wrong' && (
                  <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 space-y-1 animate-in fade-in">
                    <XCircle className="w-12 h-12 text-rose-400 animate-pulse" />
                    <span className="text-sm font-black text-white">INCORRECT</span>
                    <span className="text-xs text-rose-200">The correct code is:</span>
                    <span className="font-mono text-2xl font-black text-amber-300 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                      PLU #{currentItem.plu}
                    </span>
                  </div>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white text-center">
                {currentItem.name}
              </h3>
              {currentItem.visualDescription && (
                <p className="text-xs text-slate-400 text-center mt-1">
                  {currentItem.visualDescription}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
              <span>Card {totalAttempts + 1}</span>
              <button
                onClick={() => pickNextItem(currentItem.id)}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <span>Skip</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* POS Numeric Keypad Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              {/* Keypad Header & Layout Selector */}
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Enter PLU Number:
                </span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500 hidden sm:inline">Numpad:</span>
                  <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setKeypadLayout('pos')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        keypadLayout === 'pos'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="POS register layout: 7-8-9 top row (ends in 9 in top right)"
                    >
                      POS (7 8 9)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeypadLayout('phone')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        keypadLayout === 'phone'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Phone layout: 1-2-3 top row"
                    >
                      Phone (1 2 3)
                    </button>
                  </div>
                </div>
              </div>

              {/* Number Display Screen */}
              <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 sm:p-4 text-center shadow-inner mb-3 sm:mb-4 min-h-[60px] sm:min-h-[64px] flex items-center justify-center">
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-300">
                  {enteredPlu || <span className="text-slate-700 animate-pulse">_ _ _ _</span>}
                </span>
              </div>

              {/* Keypad Buttons (3x4 Grid - POS Layout ends with 9 in the top right) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {(keypadLayout === 'pos'
                  ? [7, 8, 9, 4, 5, 6, 1, 2, 3]
                  : [1, 2, 3, 4, 5, 6, 7, 8, 9]
                ).map(num => (
                  <button
                    key={num}
                    onClick={() => handleKeypadPress(String(num))}
                    className="py-3 sm:py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold text-white transition shadow-sm active:scale-95 border border-slate-700/60"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="py-3 sm:py-3.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-2xl text-xs font-bold transition active:scale-95 border border-slate-700/60"
                  title="Clear Input"
                >
                  CLEAR
                </button>
                <button
                  onClick={() => handleKeypadPress('0')}
                  className="py-3 sm:py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold text-white transition shadow-sm active:scale-95 border border-slate-700/60"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="py-3 sm:py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl flex items-center justify-center transition active:scale-95 border border-slate-700/60"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Submit Bar */}
            <button
              onClick={handleSubmitAnswer}
              disabled={!enteredPlu || feedback !== null}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-slate-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <CornerDownLeft className="w-4 h-4" />
              <span>CONFIRM PLU (ENTER)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <p className="text-sm text-slate-400">No active items available for training.</p>
        </div>
      )}

      {/* Missed / Trouble PLUs Review Panel */}
      {wrongItems.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Items to Practice (Recent Misses):</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {wrongItems.slice(0, 8).map(w => (
              <div
                key={w.id}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-amber-300">#{w.plu}</span>
                  <span className="text-[9px] text-slate-500 uppercase">{w.category}</span>
                </div>
                <span className="font-semibold text-slate-200 block truncate">{w.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
