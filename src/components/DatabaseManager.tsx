import React, { useState, useRef } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Sparkles,
  Download,
  Search,
  Check,
  AlertCircle,
  Radio,
  Clock,
  ArrowRight,
  ShieldCheck,
  Lock,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Eye,
  EyeOff,
  Globe,
  Printer,
  Key,
  Copy,
  FileSpreadsheet
} from 'lucide-react';
import { PLUItem, PLUCategory, SyncMessage } from '../types.ts';

interface DatabaseManagerProps {
  items: PLUItem[];
  recentEvents: SyncMessage[];
  isConnected: boolean;
  isAdminVerified: boolean;
  adminEmail: string | null;
  adminToken?: string | null;
  onOpenVerifyModal: () => void;
  onOpenEasyPluModal: () => void;
  onOpenCheatSheet?: () => void;
  onOpenWorkspaceModal?: (initialTab?: 'sheets' | 'import' | 'backup') => void;
  onAddItem: (item: Partial<PLUItem> & { image?: string }) => Promise<{ success: boolean; error?: string }>;
  onUpdateItem: (id: string, updates: Partial<PLUItem> & { image?: string }) => Promise<{ success: boolean; error?: string }>;
  onDeleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  onResetDatabase: () => Promise<{ success: boolean; error?: string }>;
  onSwitchToScanner: () => void;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  items,
  recentEvents,
  isConnected,
  isAdminVerified,
  adminEmail,
  adminToken,
  onOpenVerifyModal,
  onOpenEasyPluModal,
  onOpenCheatSheet,
  onOpenWorkspaceModal,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onResetDatabase,
  onSwitchToScanner,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAdminToken, setShowAdminToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [editingItem, setEditingItem] = useState<PLUItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string } | null>(null);

  // Form states for Add / Edit
  const [formPlu, setFormPlu] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<PLUCategory>('Produce');
  const [formVisual, setFormVisual] = useState('');
  const [formImage, setFormImage] = useState<string>('');
  const [isCapturingCamera, setIsCapturingCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoCaptureRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const openAddModal = () => {
    if (!isAdminVerified) {
      onOpenVerifyModal();
      return;
    }
    setFormPlu('');
    setFormName('');
    setFormCategory('Produce');
    setFormVisual('');
    setFormImage('');
    setIsCapturingCamera(false);
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: PLUItem) => {
    if (!isAdminVerified) {
      onOpenVerifyModal();
      return;
    }
    setEditingItem(item);
    setFormPlu(item.plu);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormVisual(item.visualDescription);
    setFormImage(item.imageUrl || '');
    setIsCapturingCamera(false);
    setIsAddModalOpen(true);
  };

  // Live camera snap for PLU reference photo
  const startCameraSnap = async () => {
    try {
      setIsCapturingCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoCaptureRef.current) {
        videoCaptureRef.current.srcObject = stream;
        await videoCaptureRef.current.play();
      }
    } catch (err) {
      console.warn('Could not start camera for reference photo:', err);
      setIsCapturingCamera(false);
      notify('error', 'Camera unavailable. Please upload a photo instead.');
    }
  };

  const stopCameraSnap = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCapturingCamera(false);
  };

  const snapReferencePhoto = () => {
    if (!videoCaptureRef.current) return;
    const video = videoCaptureRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setFormImage(dataUrl);
    stopCameraSnap();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminVerified) {
      onOpenVerifyModal();
      return;
    }
    if (!formPlu.trim() || !formName.trim()) {
      notify('error', 'PLU number and Item Name are required.');
      return;
    }

    setIsSubmitting(true);
    stopCameraSnap();

    if (editingItem) {
      const res = await onUpdateItem(editingItem.id, {
        plu: formPlu.trim(),
        name: formName.trim(),
        category: formCategory,
        visualDescription: formVisual.trim(),
        image: formImage || undefined,
        imageUrl: formImage || undefined,
      });
      if (res.success) {
        notify('success', `Updated PLU #${formPlu} (${formName}) with reference image!`);
        setIsAddModalOpen(false);
      } else {
        notify('error', res.error || 'Failed to update item.');
      }
    } else {
      const res = await onAddItem({
        plu: formPlu.trim(),
        name: formName.trim(),
        category: formCategory,
        visualDescription: formVisual.trim(),
        image: formImage || undefined,
        imageUrl: formImage || undefined,
      });
      if (res.success) {
        notify('success', `Created PLU #${formPlu} (${formName}) with reference photo!`);
        setIsAddModalOpen(false);
      } else {
        notify('error', res.error || 'Failed to add item.');
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (item: PLUItem) => {
    if (!isAdminVerified) {
      onOpenVerifyModal();
      return;
    }
    if (window.confirm(`Delete PLU #${item.plu} (${item.name})? All connected terminals will update immediately.`)) {
      const res = await onDeleteItem(item.id);
      if (res.success) {
        notify('success', `Deleted PLU #${item.plu}! Broadcasted deletion.`);
      } else {
        notify('error', res.error || 'Failed to delete item.');
      }
    }
  };

  const handleReset = async () => {
    if (!isAdminVerified) {
      onOpenVerifyModal();
      return;
    }
    if (window.confirm('Reset database back to the original Lidl UK 93 items?')) {
      const res = await onResetDatabase();
      if (res.success) {
        notify('success', 'Reset complete! Restored Lidl UK base items.');
      } else {
        notify('error', res.error || 'Failed to reset.');
      }
    }
  };

  const handleExportCSV = () => {
    const header = 'Category,PLU,Item Name,Visual Description / Notes,Image URL\n';
    const rows = items
      .map(i => `"${i.category}","${i.plu}","${i.name.replace(/"/g, '""')}","${(i.visualDescription || '').replace(/"/g, '""')}","${i.imageUrl || ''}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLU_Database_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter items
  const filteredItems = items.filter(i => {
    if (selectedCat !== 'All' && i.category !== selectedCat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return i.plu.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.visualDescription?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Real-time sync feedback banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg transition ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Authorization Status Banner */}
      {!isAdminVerified ? (
        <div className="bg-amber-950/40 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Admin Verification Required to Edit
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                The database is in protected read-only mode for retail cashiers. Only the verified administrator (<span className="text-amber-300 font-mono">scraliontis@gmail.com</span>) can add PLUs, update items, or upload reference photos.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenVerifyModal}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify as scraliontis@gmail.com</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Verified Primary Administrator:</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-400">{adminEmail}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Full permissions granted: add/edit PLUs, upload reference photos, and broadcast live sync.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              Editor Unlocked
            </span>
          </div>

          {/* Authorization Session Token Helper */}
          {adminToken && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Your Active Admin Session Bearer Token</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminToken(!showAdminToken)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {showAdminToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showAdminToken ? 'Hide' : 'Reveal Token'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[11px]">
                <span className="truncate min-w-0 flex-1 text-emerald-300">
                  {showAdminToken ? adminToken : `${adminToken.slice(0, 8)}••••••••••••••••••••••••••••••••`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(adminToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy Token</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `curl -X POST http://localhost:3000/api/plu -H "Authorization: Bearer ${adminToken}" -H "Content-Type: application/json" -d '{"plu":"999","name":"Sample Item","category":"Produce"}'`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCurl(true);
                      setTimeout(() => setCopiedCurl(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                    title="Copy sample curl command with your active token"
                  >
                    {copiedCurl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied curl!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy curl</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Pass this token in HTTP requests via <code className="text-slate-400 font-mono">Authorization: Bearer &lt;token&gt;</code> to modify the database programmatically or via API.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instant Sync Demonstration Card */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                Live Backend Database & Photo Matching
              </h2>
              <p className="text-xs text-slate-400">
                Any PLU added with a reference photo updates all cashier scanners instantly via Server-Sent Events (SSE).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={openAddModal}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add PLU with Photo</span>
            </button>
            <button
              onClick={onSwitchToScanner}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
            >
              <span>Test in Scanner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Broadcast Activity Ticker */}
        {recentEvents.length > 0 && (
          <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 flex items-center gap-2 text-xs text-slate-300 min-w-0 overflow-hidden">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-400 font-bold shrink-0">
              BROADCAST:
            </span>
            <span className="truncate text-slate-200 min-w-0 flex-1 text-[11px]">
              {recentEvents[0].message || `${recentEvents[0].type.toUpperCase()} - count ${recentEvents[0].count}`}
            </span>
            <span className="text-[10px] text-slate-500 ml-auto shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(recentEvents[0].timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Controls & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={openAddModal}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add PLU</span>
            </button>
            <button
              onClick={onOpenEasyPluModal}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Sync PLU numbers from easy-plu.knowledge-hero.com/plu-nummernsuche"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>easyPLU</span>
            </button>
            {onOpenWorkspaceModal && (
              <button
                onClick={() => onOpenWorkspaceModal('sheets')}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                title="Open Google Sheets & Drive Sync Hub"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sheets</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            {onOpenCheatSheet && (
              <button
                onClick={onOpenCheatSheet}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                title="Print 1-page cashier reference cheat sheet"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cheat Sheet</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              title="Reset to Lidl UK Base items"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span><span className="hidden sm:inline">Reset </span>Lidl Base</span>
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">
            Total Inventory: <span className="text-white font-bold">{items.length}</span> items
            {' • '}
            <span className="text-emerald-400 font-semibold">{items.filter(i => i.imageUrl).length}</span> with photos
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search PLU database by code, name, or description..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1">
            {['All', 'Produce', 'Bakery', 'Nuts'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCat === cat
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl w-full">
        <div className="overflow-x-auto max-h-[560px] w-full">
          <table className="w-full min-w-[500px] text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 z-10 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Photo</th>
                <th className="py-3 px-3 w-20">PLU</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 w-28">Category</th>
                <th className="py-3 px-4 hidden sm:table-cell">Visual Description / Store Reference</th>
                <th className="py-3 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition group">
                  <td className="py-2.5 px-3 text-center">
                    {item.imageUrl ? (
                      <button
                        onClick={() => setPreviewModalImage({ url: item.imageUrl!, title: `${item.name} (PLU #${item.plu})` })}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 inline-block hover:scale-110 transition shadow-sm"
                        title="Click to view reference photo"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-dashed border-slate-800 bg-slate-950/50 flex items-center justify-center text-slate-600 mx-auto">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-black text-sm text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                      #{item.plu}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {item.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.category === 'Produce'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : item.category === 'Bakery'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-purple-500/15 text-purple-400'
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 hidden sm:table-cell max-w-xs truncate">
                    {item.visualDescription || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title={isAdminVerified ? 'Edit Item & Reference Photo' : 'Admin verification required to edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
                        title={isAdminVerified ? 'Delete Item' : 'Admin verification required to delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit PLU Modal with Picture Upload & Camera Capture */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {editingItem ? `Edit PLU #${editingItem.plu} & Photo` : 'Add New PLU Item with Reference Photo'}
                </h3>
                <p className="text-xs text-slate-400">
                  Store reference photos help cashiers visually confirm scanned items.
                </p>
              </div>
              <button
                onClick={() => {
                  stopCameraSnap();
                  setIsAddModalOpen(false);
                }}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Picture Upload / Camera Capture Section */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <label className="block text-slate-200 font-bold flex items-center justify-between">
                  <span>Store Reference Photo</span>
                  <span className="text-[10px] text-emerald-400 font-normal">
                    Helps cashiers identify item during scans
                  </span>
                </label>

                {isCapturingCamera ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video ref={videoCaptureRef} playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={snapReferencePhoto}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snap Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCameraSnap}
                        className="px-2.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : formImage ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                      <img src={formImage} alt="Reference Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        Reference Photo Attached
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Will be displayed alongside cashier camera scans
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormImage('')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={startCameraSnap}
                      className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Upload File</span>
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* PLU & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    PLU Code Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPlu}
                    onChange={e => setFormPlu(e.target.value)}
                    placeholder="e.g. 77"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="Produce">Produce</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Nuts">Nuts</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Golden Dragonfruit"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Visual Description & Identification Notes
                </label>
                <textarea
                  rows={2}
                  value={formVisual}
                  onChange={e => setFormVisual(e.target.value)}
                  placeholder="e.g. Vibrant yellow knobbly fruit with triangular scale points and white seeded flesh"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  The AI vision model uses these cues in conjunction with the photo for barcode/PLU matches.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraSnap();
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving & Syncing...'
                    : editingItem
                    ? 'Update & Sync Instantly'
                    : 'Add PLU & Sync Instantly'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white truncate">
                {previewModalImage.title}
              </h4>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-[360px] flex items-center justify-center">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                className="w-full h-full object-contain max-h-[350px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
