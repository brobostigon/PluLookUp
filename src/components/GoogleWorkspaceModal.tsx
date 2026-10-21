import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  Upload,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  LogOut,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Table,
  Receipt,
  FileCheck,
  Info
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PLUItem, ScannedRecord } from '../types.ts';
import {
  googleSignIn,
  logoutGoogle,
  initAuth
} from '../services/googleAuth.ts';
import {
  listDriveSpreadsheets,
  exportCatalogToGoogleSheet,
  exportSlipToGoogleSheet,
  getSpreadsheetDetails,
  readSpreadsheetValues,
  parseSpreadsheetRowsToPLUs,
  backupDatabaseToGoogleDrive,
  DriveSpreadsheetFile,
  SpreadsheetMetadata,
  ParsedPluPreview
} from '../services/googleWorkspace.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PLUItem[];
  slipRecords?: ScannedRecord[];
  onImportItems: (newItems: Partial<PLUItem>[], replaceAll: boolean) => Promise<void>;
  initialTab?: 'sheets' | 'import' | 'backup';
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  items,
  slipRecords = [],
  onImportItems,
  initialTab = 'sheets'
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'import' | 'backup'>(initialTab);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Export State
  const [exportSheetTitle, setExportSheetTitle] = useState(`PLU Store Catalog - ${new Date().toLocaleDateString()}`);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ url: string; count: number } | null>(null);
  const [isExportingSlip, setIsExportingSlip] = useState(false);
  const [slipExportSuccess, setSlipExportSuccess] = useState<{ url: string; count: number; total: number } | null>(null);

  // Import State
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [manualSheetInput, setManualSheetInput] = useState<string>('');
  const [sheetMetadata, setSheetMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedPluPreview[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<{ fileName: string; webViewLink: string } | null>(null);

  // Sync initial tab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setExportSuccess(null);
      setSlipExportSuccess(null);
      setImportSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setAuthError(null);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch drive spreadsheets when import tab is active and user is logged in
  useEffect(() => {
    if (isOpen && user && activeTab === 'import' && driveFiles.length === 0) {
      loadDriveFiles();
    }
  }, [isOpen, user, activeTab]);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google sign in failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setDriveFiles([]);
      setSheetMetadata(null);
      setParsedItems([]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    setAuthError(null);
    try {
      const files = await listDriveSpreadsheets();
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to list spreadsheets from Google Drive');
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // Handle Export Catalog to Google Sheet
  const handleExportCatalog = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const result = await exportCatalogToGoogleSheet(exportSheetTitle, items);
      setExportSuccess({ url: result.spreadsheetUrl, count: result.totalItems });
    } catch (err: any) {
      alert(`Export to Google Sheets failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export Register Slip to Google Sheet
  const handleExportSlip = async () => {
    if (slipRecords.length === 0) return;
    setIsExportingSlip(true);
    setSlipExportSuccess(null);
    try {
      const result = await exportSlipToGoogleSheet(
        `Register Slip - ${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`,
        slipRecords
      );
      setSlipExportSuccess({
        url: result.spreadsheetUrl,
        count: result.totalItems,
        total: result.totalAmount
      });
    } catch (err: any) {
      alert(`Export slip failed: ${err.message}`);
    } finally {
      setIsExportingSlip(false);
    }
  };

  // Handle Load Spreadsheet for Import
  const handleInspectSpreadsheet = async (sheetIdOrUrl: string) => {
    let cleanId = sheetIdOrUrl.trim();
    // If full Google Sheets URL was pasted
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      cleanId = match[1];
    }

    if (!cleanId) return;

    setIsLoadingSheet(true);
    setSheetMetadata(null);
    setParsedItems([]);
    try {
      const details = await getSpreadsheetDetails(cleanId);
      setSheetMetadata(details);
      if (details.sheets.length > 0) {
        const defaultSheet = details.sheets[0].title;
        setSelectedSheetTitle(defaultSheet);
        await handleFetchSheetData(cleanId, defaultSheet);
      }
    } catch (err: any) {
      alert(`Failed to load Google Sheet: ${err.message}`);
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleFetchSheetData = async (spreadsheetId: string, sheetTitle: string) => {
    try {
      const rows = await readSpreadsheetValues(spreadsheetId, sheetTitle);
      const parsed = parseSpreadsheetRowsToPLUs(rows);
      setParsedItems(parsed);
    } catch (err: any) {
      alert(`Failed to read sheet data: ${err.message}`);
    }
  };

  // Handle Confirm Import with Destructive check
  const handleExecuteImport = async () => {
    const validItems = parsedItems.filter(p => p.isValid);
    if (validItems.length === 0) return;

    setIsImporting(true);
    try {
      await onImportItems(validItems, replaceExisting);
      setImportSuccessMsg(
        `Successfully imported ${validItems.length} PLU items from Google Sheet! ${
          replaceExisting ? '(Replaced existing database)' : '(Merged with catalog)'
        }`
      );
      setShowConfirmModal(false);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Cloud Backup to Google Drive
  const handleBackupToDrive = async () => {
    setIsBackingUp(true);
    setBackupSuccess(null);
    try {
      const res = await backupDatabaseToGoogleDrive(items);
      setBackupSuccess(res);
    } catch (err: any) {
      alert(`Google Drive backup failed: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-bold text-white truncate">Google Sheets & Drive</h3>
                <span className="text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                  Workspace
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Sync PLU inventory spreadsheets, sales reports, and Drive backups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 sm:px-4 pt-1.5 sm:pt-2 gap-1 sm:gap-2 text-xs font-semibold overflow-x-auto w-full">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'sheets'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Export<span className="hidden xs:inline"> to Sheets</span></span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Import<span className="hidden xs:inline"> from Sheets</span></span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span><span className="hidden xs:inline">Drive </span>Backup</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* User Sign-In Banner / Google Auth Guard */}
          {!user ? (
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-inner">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Connect Google Workspace</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Sign in with your Google account to access your Google Sheets spreadsheets and save PLU catalog exports or backups directly to Google Drive.
                </p>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl max-w-md mx-auto flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-center">
                <GoogleSignInButton onClick={handleSignIn} disabled={isAuthLoading} />
              </div>
              <p className="text-[11px] text-slate-500">
                Grants access to Google Drive and Google Sheets with permission from your account.
              </p>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-7 h-7 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{user.displayName || 'Connected Account'}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                      Drive + Sheets Active
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{user.email}</span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors text-[11px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          )}

          {/* TAB 1: EXPORT TO GOOGLE SHEETS */}
          {user && activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Table className="w-4 h-4 text-emerald-400" />
                      <span>Export Full PLU Catalog</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Generate a styled Google Spreadsheet containing all {items.length} items with PLU codes, prices, categories, barcodes, and keywords.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-mono text-xs font-semibold whitespace-nowrap">
                    {items.length} items
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Spreadsheet Name in Google Drive</label>
                  <input
                    type="text"
                    value={exportSheetTitle}
                    onChange={(e) => setExportSheetTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Lidl Store #402 PLU Inventory"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Includes header formatting and column auto-sizing</span>
                  </span>
                  <button
                    onClick={handleExportCatalog}
                    disabled={isExporting || items.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating Spreadsheet...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Export Catalog to Sheet</span>
                      </>
                    )}
                  </button>
                </div>

                {exportSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Successfully exported <strong>{exportSuccess.count}</strong> PLU records to Google Sheets!
                      </span>
                    </div>
                    <a
                      href={exportSuccess.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 hover:bg-emerald-400 transition-colors"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Export Register Slip Section */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-cyan-400" />
                      <span>Export Register Slip / Sales Ledger</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Save current cashier checkout slip items and totals into a Google Sheet for accounting or daily sales auditing.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg font-mono text-xs font-semibold whitespace-nowrap">
                    {slipRecords.length} lines on slip
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    {slipRecords.length === 0
                      ? 'No items currently in register slip'
                      : `Total: €${slipRecords
                          .reduce(
                            (acc, r) =>
                              acc + (r.weightKg ? r.weightKg * (r.price || 0) : r.quantity * (r.price || 0)),
                            0
                          )
                          .toFixed(2)}`}
                  </span>
                  <button
                    onClick={handleExportSlip}
                    disabled={isExportingSlip || slipRecords.length === 0}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isExportingSlip ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Export Slip to Google Sheet</span>
                      </>
                    )}
                  </button>
                </div>

                {slipExportSuccess && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-center justify-between text-xs text-cyan-300 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        Exported {slipExportSuccess.count} lines (€{slipExportSuccess.total.toFixed(2)})!
                      </span>
                    </div>
                    <a
                      href={slipExportSuccess.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 hover:bg-cyan-400 transition-colors"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT FROM GOOGLE SHEETS */}
          {user && activeTab === 'import' && (
            <div className="space-y-4">
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Step 1: Select Spreadsheet from Drive */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>Select Google Sheet from Drive</span>
                  </h4>
                  <button
                    onClick={loadDriveFiles}
                    disabled={isLoadingDriveFiles}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingDriveFiles ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Fetching spreadsheets from your Google Drive...</span>
                  </div>
                ) : driveFiles.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => {
                          setSelectedFileId(file.id);
                          handleInspectSpreadsheet(file.id);
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          selectedFileId === file.id
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold truncate text-slate-200">{file.name}</p>
                            <p className="text-[10px] text-slate-500">
                              Modified {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-semibold text-slate-300"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No spreadsheets found in Drive root. You can paste a sheet URL or ID below.
                  </div>
                )}

                {/* Or paste Sheet URL / ID */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Or Paste Google Sheet URL or ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualSheetInput}
                      onChange={(e) => setManualSheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                    />
                    <button
                      onClick={() => handleInspectSpreadsheet(manualSheetInput)}
                      disabled={isLoadingSheet || !manualSheetInput.trim()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      {isLoadingSheet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Spreadsheet Preview & Sheet Tab Selection */}
              {sheetMetadata && (
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span>{sheetMetadata.title}</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        {parsedItems.length} items parsed from selected tab
                      </p>
                    </div>

                    {sheetMetadata.sheets.length > 1 && (
                      <select
                        value={selectedSheetTitle}
                        onChange={(e) => {
                          setSelectedSheetTitle(e.target.value);
                          handleFetchSheetData(sheetMetadata.id, e.target.value);
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5"
                      >
                        {sheetMetadata.sheets.map((s) => (
                          <option key={s.sheetId} value={s.title}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Preview Items Table */}
                  <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/60 divide-y divide-slate-800 text-xs">
                    {parsedItems.slice(0, 15).map((p, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            {p.plu || '—'}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-200">{p.name || '(Unnamed)'}</p>
                            <span className="text-[10px] text-slate-500">
                              {p.category} • {p.price !== undefined ? `€${p.price.toFixed(2)}/${p.priceUnit || 'kg'}` : 'No price'}
                            </span>
                          </div>
                        </div>
                        {p.isValid ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Valid
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            {p.validationError || 'Invalid'}
                          </span>
                        )}
                      </div>
                    ))}
                    {parsedItems.length > 15 && (
                      <div className="p-2 text-center text-[11px] text-slate-500 font-mono">
                        + {parsedItems.length - 15} more rows parsed
                      </div>
                    )}
                  </div>

                  {/* Import Configuration */}
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={(e) => setReplaceExisting(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                      />
                      <span>
                        <strong>Replace entire database</strong> with this spreadsheet (uncheck to merge/update only)
                      </span>
                    </label>
                  </div>

                  {/* Trigger Confirmation Dialog */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={parsedItems.filter((p) => p.isValid).length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import {parsedItems.filter((p) => p.isValid).length} PLU Items</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DRIVE CLOUD BACKUP */}
          {user && activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>Google Drive Database Backup</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Create an encrypted JSON snapshot of your entire database ({items.length} produce and bakery items) and store it securely in your personal Google Drive.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Items to backup:</span>
                    <span className="font-mono text-slate-200 font-semibold">{items.length} records</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Storage destination:</span>
                    <span className="text-slate-200 font-medium">Google Drive Root</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Format:</span>
                    <span className="font-mono text-emerald-400">JSON Archive (.json)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safe cloud backup with one-click restore capability</span>
                  </span>
                  <button
                    onClick={handleBackupToDrive}
                    disabled={isBackingUp || items.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Backup to Drive...</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Backup to Google Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {backupSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Backed up successfully as <strong>{backupSuccess.fileName}</strong>!
                      </span>
                    </div>
                    <a
                      href={backupSuccess.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 hover:bg-emerald-400 transition-colors"
                    >
                      <span>View in Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Google Drive API v3 & Sheets API v4 with OAuth 2.0</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* MANDATORY User Confirmation Dialog for Destructive / Mutating Operations */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-white">Confirm Spreadsheet Import</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {replaceExisting ? (
                <span>
                  <strong>WARNING:</strong> This action will <strong>OVERWRITE AND REPLACE</strong> your current database with{' '}
                  <strong className="text-white">{parsedItems.filter((p) => p.isValid).length}</strong> items from{' '}
                  <span className="text-emerald-400 font-mono">"{sheetMetadata?.title}"</span>. Any custom items not in the spreadsheet will be deleted.
                </span>
              ) : (
                <span>
                  You are about to import{' '}
                  <strong className="text-white">{parsedItems.filter((p) => p.isValid).length}</strong> items from{' '}
                  <span className="text-emerald-400 font-mono">"{sheetMetadata?.title}"</span> into your PLU database. Existing matching items will be updated.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2"
              >
                {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Import</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
