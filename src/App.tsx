import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { ScannerView } from './components/ScannerView.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { DatabaseManager } from './components/DatabaseManager.tsx';
import { RegisterSlip } from './components/RegisterSlip.tsx';
import { TrainingMode } from './components/TrainingMode.tsx';
import { AdminVerificationModal } from './components/AdminVerificationModal.tsx';
import { EasyPluSyncModal } from './components/EasyPluSyncModal.tsx';
import { PrintCheatSheetModal } from './components/PrintCheatSheetModal.tsx';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal.tsx';
import { useLivePluSync } from './hooks/useLivePluSync.ts';
import { ScannedRecord, PLUItem } from './types.ts';
import { AlertTriangle, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

const DESIGNATED_ADMIN_EMAIL = 'scraliontis@gmail.com';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'catalog' | 'drill' | 'database' | 'slip'>('scanner');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isEasyPluModalOpen, setIsEasyPluModalOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<'sheets' | 'import' | 'backup'>('sheets');
  const [slipRecords, setSlipRecords] = useState<ScannedRecord[]>([]);

  const {
    items,
    isConnected,
    lastSyncTime,
    recentEvents,
    error,
    notification,
    isAdminVerified,
    adminEmail,
    adminToken,
    verifyAdmin,
    logoutAdmin,
    addItem,
    updateItem,
    deleteItem,
    resetDatabase,
    syncEasyPlu,
    syncGoogleSheets,
  } = useLivePluSync();

  // Slip handlers
  const handleAddToSlip = (record: ScannedRecord) => {
    setSlipRecords(prev => {
      const existing = prev.find(r => r.plu === record.plu);
      if (existing) {
        return prev.map(r => (r.plu === record.plu ? { ...r, quantity: r.quantity + 1 } : r));
      }
      return [record, ...prev];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setSlipRecords(prev =>
      prev
        .map(r => {
          if (r.id === id) {
            const newQty = r.quantity + delta;
            return newQty > 0 ? { ...r, quantity: newQty } : null;
          }
          return r;
        })
        .filter(Boolean) as ScannedRecord[]
    );
  };

  const handleRemoveRecord = (id: string) => {
    setSlipRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleClearSlip = () => {
    setSlipRecords([]);
  };

  const handleOpenEasyPluModal = () => {
    if (!isAdminVerified) {
      setIsVerifyModalOpen(true);
    } else {
      setIsEasyPluModalOpen(true);
    }
  };

  const handleOpenWorkspace = (tab: 'sheets' | 'import' | 'backup' = 'sheets') => {
    setWorkspaceInitialTab(tab);
    setIsWorkspaceModalOpen(true);
  };

  const handleImportFromGoogleSheets = async (importedItems: Partial<PLUItem>[], replaceAll: boolean) => {
    await syncGoogleSheets(importedItems, replaceAll);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header with Live Sync Status & Admin Verification Pill */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        itemCount={items.length}
        lastSyncTime={lastSyncTime}
        slipCount={slipRecords.reduce((acc, r) => acc + r.quantity, 0)}
        isMobileFrame={isMobileFrame}
        setIsMobileFrame={setIsMobileFrame}
        isAdminVerified={isAdminVerified}
        adminEmail={adminEmail}
        onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
        onLogoutAdmin={logoutAdmin}
        onOpenWorkspaceModal={() => handleOpenWorkspace('sheets')}
      />

      {/* Real-time Broadcast Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce duration-1000 max-w-sm px-4">
          <div className="bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-extrabold text-xs border-2 border-emerald-300">
            <Sparkles className="w-4 h-4 shrink-0 text-slate-950" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Admin Verification Modal */}
      <AdminVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onVerify={verifyAdmin}
        designatedEmail={DESIGNATED_ADMIN_EMAIL}
      />

      {/* easyPLU Synchronization Modal */}
      <EasyPluSyncModal
        isOpen={isEasyPluModalOpen}
        onClose={() => setIsEasyPluModalOpen(false)}
        onSyncEasyPlu={syncEasyPlu}
        currentItems={items}
      />

      {/* 1-Page Printable Cashier Cheat Sheet Modal */}
      <PrintCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        items={items}
      />

      {/* Google Sheets & Drive Workspace Hub Modal */}
      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        items={items}
        slipRecords={slipRecords}
        onImportItems={handleImportFromGoogleSheets}
        initialTab={workspaceInitialTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-3 sm:py-6 px-2 sm:px-4 flex justify-center w-full min-w-0">
        <div
          className={`w-full min-w-0 transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-[430px] bg-slate-900/60 p-2.5 sm:p-4 rounded-3xl sm:rounded-[40px] border-2 sm:border-4 border-slate-800 shadow-2xl relative my-1 sm:my-2'
              : 'max-w-4xl'
          }`}
        >
          {/* Mobile Shell Notch & Speaker Bar Indicator */}
          {isMobileFrame && (
            <div className="flex flex-col items-center mb-3">
              <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center mb-1">
                <div className="w-8 h-1 bg-slate-700 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>Mobile Cashier Terminal Mode</span>
              </div>
            </div>
          )}

          {/* Connection Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Tab Views */}
          {activeTab === 'scanner' && (
            <ScannerView onAddToSlip={handleAddToSlip} activeItems={items} />
          )}

          {activeTab === 'catalog' && (
            <CatalogView
              items={items}
              onAddToSlip={handleAddToSlip}
              onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
            />
          )}

          {activeTab === 'drill' && (
            <TrainingMode items={items} />
          )}

          {activeTab === 'database' && (
            <DatabaseManager
              items={items}
              recentEvents={recentEvents}
              isConnected={isConnected}
              isAdminVerified={isAdminVerified}
              adminEmail={adminEmail}
              adminToken={adminToken}
              onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
              onOpenEasyPluModal={handleOpenEasyPluModal}
              onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
              onOpenWorkspaceModal={handleOpenWorkspace}
              onAddItem={addItem}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onResetDatabase={resetDatabase}
              onSwitchToScanner={() => setActiveTab('scanner')}
            />
          )}

          {activeTab === 'slip' && (
            <RegisterSlip
              records={slipRecords}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveRecord={handleRemoveRecord}
              onClearSlip={handleClearSlip}
              onSwitchToScanner={() => setActiveTab('scanner')}
              onExportToSheets={() => handleOpenWorkspace('sheets')}
            />
          )}
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-slate-950 border-t border-slate-900 py-2.5 px-4 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>PLU Snap & Sync • Gemini 3.8 Flash Vision Engine</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Admin: {DESIGNATED_ADMIN_EMAIL}</span>
          </span>
          <span>•</span>
          <span className="text-slate-400 font-mono">
            {isConnected ? 'SSE Live Stream Active' : 'Offline Cache'}
          </span>
        </div>
      </footer>
    </div>
  );
}
