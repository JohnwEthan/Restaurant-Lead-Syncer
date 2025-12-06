import { Customer, VerificationResult } from '../types';
import { API_URL } from '../constants';

const CACHE_KEY = 'gas_data_cache';
const LAST_SYNC_KEY = 'gas_last_sync';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 Minutes

// --- 1. MOCK DATA (Fallback) ---
const MOCK_DATA: Customer[] = [
  { phone: '9876543210', name: 'Rahul Kumar (Mock)', status: 'pending', discount: 300, created_date: '2024-12-01', lead_id: 'mock_1' },
];

// --- 2. LOCAL STORAGE HELPERS ---
const saveToCache = (data: Customer[]) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
};

const getFromCache = (): Customer[] => {
  const data = localStorage.getItem(CACHE_KEY);
  return data ? JSON.parse(data) : MOCK_DATA;
};

export const getLastSyncTime = (): string => {
  const ts = localStorage.getItem(LAST_SYNC_KEY);
  if (!ts) return 'Not Synced';
  const minutes = Math.floor((Date.now() - parseInt(ts)) / 60000);
  if (minutes < 1) return 'Just now';
  return `${minutes} mins ago`;
};

export const getRecordCount = (): number => {
  const data = getFromCache();
  return data.length;
};

// Helper: Delay for retry
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- 3. MAIN SERVICE METHODS ---

export const initializeDatabase = async (): Promise<boolean> => {
  if (!localStorage.getItem(CACHE_KEY)) {
    saveToCache(MOCK_DATA);
  }
  return await syncData();
};

export const syncData = async (): Promise<boolean> => {
  // STRATEGY 1: Internal Google Apps Script Environment
  if (typeof window.google !== 'undefined') {
    return new Promise((resolve) => {
      window.google!.script.run
        .withSuccessHandler((data: string) => {
          try {
            const parsedData: Customer[] = JSON.parse(data);
            saveToCache(parsedData);
            console.log('Synced with Google Sheet (Internal)!', parsedData.length, 'rows');
            resolve(true);
          } catch (e) {
            console.error('Failed to parse sheet data', e);
            resolve(false);
          }
        })
        .withFailureHandler((err: any) => {
          console.error('GAS Connection Failed', err);
          resolve(false);
        })
        .getAllData();
    });
  } 
  
  // STRATEGY 2: External/Local Environment (Using Webhook URL)
  else if (API_URL) {
    const cleanUrl = API_URL.trim();
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`Fetching from API (Attempt ${attempts + 1})...`);
        
        // Add timestamp to prevent caching
        const response = await fetch(`${cleanUrl}?action=getData&t=${Date.now()}`, {
          method: 'GET',
          credentials: 'omit',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const parsedData: Customer[] = await response.json();
        
        // Handle "Error" response from GAS
        if (!Array.isArray(parsedData) && (parsedData as any).error) {
          throw new Error('Script Error: ' + (parsedData as any).error);
        }

        if (Array.isArray(parsedData)) {
          saveToCache(parsedData);
          console.log('Synced with Google Sheet (External)!', parsedData.length, 'rows');
          return true;
        } else {
          console.warn('Received invalid data structure', parsedData);
          return false;
        }
        
      } catch (e) {
        console.error(`Sync Attempt ${attempts + 1} Failed:`, e);
        attempts++;
        if (attempts < maxAttempts) await delay(1500 * attempts); 
      }
    }
    return false;
  }

  console.warn('No connection method available. Using local cache/mock.');
  return false;
};

export const checkOffer = async (phoneNumber: string): Promise<VerificationResult> => {
  const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');
  
  // Auto-sync if stale (older than 5 mins)
  if (Date.now() - lastSync > SYNC_INTERVAL && navigator.onLine) {
    syncData(); 
  }

  const data = getFromCache();
  // Simple normalization for search (last 10 digits)
  const normalize = (p: string) => p.replace(/\D/g, '').slice(-10);
  const searchPhone = normalize(phoneNumber);
  
  const customer = data.find(c => normalize(c.phone) === searchPhone);

  if (!customer) {
    // Debug helper: log what we have to console
    console.log(`Checked ${searchPhone} against ${data.length} records. No match.`);
    return { 
      valid: false, 
      message: 'No offer found on this number\nइस नंबर पर कोई ऑफर नहीं मिला' 
    };
  }

  if (customer.status === 'used') {
    return { 
      valid: false, 
      message: `Offer already used on ${customer.used_date || 'unknown date'}\nऑफर का उपयोग पहले ही किया जा चुका है` 
    };
  }

  return { 
    valid: true, 
    message: 'Valid Offer', 
    customer 
  };
};

export const confirmOfferUsage = async (
  phoneNumber: string, 
  purchaseValue: number, 
  customerData?: Customer 
): Promise<boolean> => {
  
  const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. Optimistic Update (Update local UI immediately)
  const data = getFromCache();
  const index = data.findIndex(c => c.phone === phoneNumber);
  
  if (index !== -1) {
    data[index].status = 'used';
    data[index].used_date = new Date().toISOString().split('T')[0];
    saveToCache(data);
  }

  const payload = {
    phone: phoneNumber,
    purchaseValue: purchaseValue,
    eventId: eventId,
    leadId: customerData?.lead_id || '',
    metaData: customerData?.meta_data || ''
  };

  // 2. Send to Google Sheet
  
  // Method A: Internal GAS
  if (typeof window.google !== 'undefined') {
    return new Promise((resolve) => {
      window.google!.script.run
        .withSuccessHandler(() => resolve(true))
        .withFailureHandler(() => resolve(false))
        .markAsUsed(payload.phone, payload.purchaseValue, payload.eventId, payload.leadId, payload.metaData);
    });
  } 
  
  // Method B: External API
  else if (API_URL) {
    try {
      const cleanUrl = API_URL.trim();
      // Use standard fetch without preflight triggers
      await fetch(cleanUrl, {
        method: 'POST',
        credentials: 'omit', 
        headers: {
          'Content-Type': 'text/plain', 
        },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (e) {
      console.error("API Post failed", e);
      return true; 
    }
  }

  return true;
};