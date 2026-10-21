import { useState, useEffect, useCallback, useRef } from 'react';
import { PLUItem, SyncMessage } from '../types.ts';

export function useLivePluSync() {
  const [items, setItems] = useState<PLUItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [recentEvents, setRecentEvents] = useState<SyncMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Admin Verification States
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('plu_admin_token');
    } catch (_) {
      return null;
    }
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);

  const triggerNotification = useCallback((msg: string) => {
    setNotification(msg);
    if (notificationTimeoutRef.current) {
      window.clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  // Check admin verification status on startup
  useEffect(() => {
    async function checkAdminStatus() {
      if (!adminToken) {
        setIsAdminVerified(false);
        setAdminEmail(null);
        return;
      }
      try {
        const res = await fetch('/api/admin/status', {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        const data = await res.json();
        if (data.verified) {
          setIsAdminVerified(true);
          setAdminEmail(data.email);
        } else {
          setIsAdminVerified(false);
          setAdminEmail(null);
          localStorage.removeItem('plu_admin_token');
        }
      } catch (err) {
        console.warn('Failed to verify admin token:', err);
      }
    }

    checkAdminStatus();
  }, [adminToken]);

  // Admin login / verify action
  const verifyAdmin = useCallback(async (email: string, passcode?: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Admin verification failed.');
      }

      setAdminToken(data.token);
      setIsAdminVerified(true);
      setAdminEmail(data.email);
      try {
        localStorage.setItem('plu_admin_token', data.token);
      } catch (_) {}

      triggerNotification(`🛡️ Verified as Primary Administrator (${data.email})`);
      return { success: true, email: data.email };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [triggerNotification]);

  const logoutAdmin = useCallback(async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (_) {}
    }
    setAdminToken(null);
    setIsAdminVerified(false);
    setAdminEmail(null);
    try {
      localStorage.removeItem('plu_admin_token');
    } catch (_) {}
    triggerNotification('Admin session locked.');
  }, [adminToken, triggerNotification]);

  // Connect to SSE stream
  useEffect(() => {
    let active = true;

    function connectSSE() {
      if (!active) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/plu/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!active) return;
        setIsConnected(true);
        setError(null);
      };

      es.onmessage = (event) => {
        if (!active) return;
        try {
          const data: SyncMessage = JSON.parse(event.data);
          setLastSyncTime(new Date());

          if (data.type === 'initial' && data.items) {
            setItems(data.items);
            try {
              localStorage.setItem('plu_cache', JSON.stringify(data.items));
            } catch (_) {}
          } else if (data.type === 'create' && data.item) {
            setItems(prev => {
              const next = [data.item!, ...prev.filter(i => i.id !== data.item!.id && i.plu !== data.item!.plu)];
              try { localStorage.setItem('plu_cache', JSON.stringify(next)); } catch (_) {}
              return next;
            });
            triggerNotification(`✨ Live Update: Added PLU #${data.item.plu} (${data.item.name})`);
          } else if (data.type === 'update' && data.item) {
            setItems(prev => {
              const next = prev.map(i => (i.id === data.item!.id || i.plu === data.item!.plu ? data.item! : i));
              try { localStorage.setItem('plu_cache', JSON.stringify(next)); } catch (_) {}
              return next;
            });
            triggerNotification(`🔄 Live Update: PLU #${data.item.plu} (${data.item.name}) updated`);
          } else if (data.type === 'delete' && data.item) {
            setItems(prev => {
              const next = prev.filter(i => i.id !== data.item!.id && i.plu !== data.item!.plu);
              try { localStorage.setItem('plu_cache', JSON.stringify(next)); } catch (_) {}
              return next;
            });
            triggerNotification(`🗑️ Live Update: Removed PLU #${data.item.plu} (${data.item.name})`);
          } else if (data.type === 'reset' && data.items) {
            setItems(data.items);
            try { localStorage.setItem('plu_cache', JSON.stringify(data.items)); } catch (_) {}
            triggerNotification('🔄 Live Update: Database reset to Lidl UK base inventory');
          }

          setRecentEvents(prev => [data, ...prev.slice(0, 14)]);
        } catch (err) {
          console.error('Error handling SSE message:', err);
        }
      };

      es.onerror = () => {
        if (!active) return;
        setIsConnected(false);
        setError('Reconnecting to live backend database...');
        es.close();
        setTimeout(() => {
          if (active) connectSSE();
        }, 3000);
      };
    }

    try {
      const cached = localStorage.getItem('plu_cache');
      if (cached) {
        setItems(JSON.parse(cached));
      }
    } catch (_) {}

    connectSSE();

    return () => {
      active = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [triggerNotification]);

  // Protected mutation actions passing Admin authorization token
  const addItem = useCallback(async (itemData: Partial<PLUItem> & { image?: string }) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch('/api/plu', {
        method: 'POST',
        headers,
        body: JSON.stringify(itemData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add item');
      }
      return { success: true, item: data.item };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [adminToken]);

  const updateItem = useCallback(async (id: string, updates: Partial<PLUItem> & { image?: string }) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch(`/api/plu/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update item');
      }
      return { success: true, item: data.item };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [adminToken]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch(`/api/plu/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [adminToken]);

  const resetDatabase = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch('/api/plu/reset', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset database');
      }
      return { success: true, count: data.count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [adminToken]);

  const syncEasyPlu = useCallback(async (payload: {
    items?: Partial<PLUItem>[];
    mode?: 'merge' | 'replace';
    easyPluToken?: string;
  }) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch('/api/plu/sync-easyplu', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with easyPLU');
      }
      return { success: true, message: data.message, count: data.count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [adminToken]);

  const syncGoogleSheets = useCallback(async (importedItems: Partial<PLUItem>[], replaceAll: boolean = false) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch('/api/plu/sync-easyplu', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: importedItems,
          mode: replaceAll ? 'replace' : 'merge',
          source: 'sheets'
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with Google Sheets');
      }
      triggerNotification(`📊 Synced ${importedItems.length} items from Google Sheets!`);
      return { success: true, count: data.count, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [adminToken, triggerNotification]);

  return {
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
  };
}
