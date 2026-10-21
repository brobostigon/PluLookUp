import React, { useState } from 'react';
import { ShieldCheck, Key, AlertCircle, CheckCircle2, UserCheck, Eye, EyeOff } from 'lucide-react';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (email: string, passcode?: string) => Promise<{ success: boolean; error?: string }>;
  designatedEmail: string;
}

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  designatedEmail,
}) => {
  const [email, setEmail] = useState(designatedEmail);
  const [passcode, setPasscode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter your manager PIN.');
      return;
    }
    setErrorMsg(null);
    setIsVerifying(true);

    const res = await onVerify(email.trim(), passcode.trim());
    setIsVerifying(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPasscode('');
        onClose();
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Verification failed. Only the designated administrator is authorized.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                Admin Verification
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Authorized database editor access
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPasscode('');
              setErrorMsg(null);
              onClose();
            }}
            className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-white text-sm">Identity Verified!</h4>
            <p className="text-xs text-emerald-400">
              Unlocked full database management permissions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Designated Primary Administrator
              </span>
              <p className="text-xs font-semibold text-slate-200 font-mono">
                {designatedEmail}
              </p>
              <p className="text-[11px] text-slate-400">
                To prevent accidental or unauthorized changes from retail checkout terminals, database editing is exclusively restricted to this account.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold">
                Administrator Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="scraliontis@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-white outline-none font-medium text-xs transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-semibold">
                  Manager Security PIN
                </label>
                <span className="text-[10px] text-slate-500">Confidential</span>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="Enter manager security PIN"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono outline-none text-xs tracking-widest transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPasscode('');
                  setErrorMsg(null);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying Identity...' : 'Verify & Unlock Database'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
