import React from 'react';
import { Camera, Database, Search, ShoppingBag, Radio, Smartphone, Monitor, ShieldCheck, Lock, LogOut, GraduationCap, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  activeTab: 'scanner' | 'catalog' | 'drill' | 'database' | 'slip';
  setActiveTab: (tab: 'scanner' | 'catalog' | 'drill' | 'database' | 'slip') => void;
  isConnected: boolean;
  itemCount: number;
  lastSyncTime: Date | null;
  slipCount: number;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  isAdminVerified: boolean;
  adminEmail: string | null;
  onOpenVerifyModal: () => void;
  onLogoutAdmin: () => void;
  onOpenWorkspaceModal?: () => void;
  isWorkspaceConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  itemCount,
  lastSyncTime,
  slipCount,
  isMobileFrame,
  setIsMobileFrame,
  isAdminVerified,
  adminEmail,
  onOpenVerifyModal,
  onLogoutAdmin,
  onOpenWorkspaceModal,
  isWorkspaceConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md w-full">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3">
        {/* Top Bar: Brand, SSE Status & Quick Utility Actions */}
        <div className="flex items-center justify-between gap-2 min-w-0 w-full lg:w-auto">
          {/* Brand & Live Sync Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold tracking-tight text-sm sm:text-base md:text-lg bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent truncate">
                  PLU Snap & Sync
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                  Lidl UK
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">
                Instant Produce Vision & Real-Time Backend Sync
              </p>
            </div>
          </div>

          {/* Quick Utility Actions: SSE Pill + Sheets + Admin Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Real-time SSE Connection Indicator */}
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}
              title={lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleTimeString()}` : 'Connecting...'}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <Radio className="w-3 h-3 hidden sm:inline" />
              <span className="hidden sm:inline">
                {isConnected ? `Synced (${itemCount})` : 'Syncing...'}
              </span>
            </div>

            {/* Google Sheets & Drive Hub Button */}
            {onOpenWorkspaceModal && (
              <button
                onClick={onOpenWorkspaceModal}
                className="flex items-center gap-1 sm:gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 hover:border-emerald-500/60 px-2 sm:px-2.5 py-1 rounded-xl text-xs text-emerald-300 font-semibold transition shadow-sm shrink-0"
                title="Google Sheets & Google Drive Workspace Integration"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] hidden xs:inline">Sheets</span>
                {isWorkspaceConnected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            )}

            {/* Admin Verification Pill */}
            {isAdminVerified ? (
              <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/40 px-2 sm:px-2.5 py-1 rounded-xl text-xs text-emerald-300 font-semibold shadow-sm shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] hidden sm:inline max-w-[100px] truncate" title={adminEmail || 'Verified Admin'}>
                  {adminEmail}
                </span>
                <span className="text-[10px] sm:hidden font-bold">Admin</span>
                <button
                  onClick={onLogoutAdmin}
                  className="text-slate-400 hover:text-rose-400 transition ml-0.5 p-0.5 rounded"
                  title="Lock Admin Session"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenVerifyModal}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-2 sm:px-2.5 py-1 rounded-xl text-xs text-slate-300 hover:text-white font-medium transition shrink-0"
                title="Verify as Store Manager to Edit Database"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] hidden xs:inline">Admin</span>
              </button>
            )}

            {/* Desktop/Mobile Frame Simulator Toggle (Desktop only) */}
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition shrink-0"
              title={isMobileFrame ? 'Switch to Full Counter View' : 'Simulate Mobile Terminal Frame'}
            >
              {isMobileFrame ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Desktop</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Mobile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Bar on Mobile / Right Cluster on Desktop: Auto-Scaling 5-Tab Navigation */}
        <nav className="w-full lg:w-auto grid grid-cols-5 sm:flex sm:items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-[11px] sm:text-xs font-semibold shrink-0 gap-0.5 sm:gap-1">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-1.5 rounded-lg transition-all min-w-0 ${
              activeTab === 'scanner'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-1.5 rounded-lg transition-all min-w-0 ${
              activeTab === 'catalog'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('drill')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-1.5 rounded-lg transition-all min-w-0 ${
              activeTab === 'drill'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Practice & Cashier PLU Speed Drill"
          >
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Drill</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-1.5 rounded-lg transition-all relative min-w-0 ${
              activeTab === 'database'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate sm:hidden">DB</span>
            <span className="hidden sm:inline truncate">Backend DB</span>
            {!isAdminVerified && (
              <Lock className="w-2 h-2 text-amber-400 absolute top-1 right-1" />
            )}
            {isAdminVerified && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('slip')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-1.5 rounded-lg transition-all relative min-w-0 ${
              activeTab === 'slip'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Slip</span>
            {slipCount > 0 && (
              <span className="bg-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-black rounded-full px-1 sm:px-1.5 py-0.2 min-w-[16px] text-center ml-0.5">
                {slipCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};

