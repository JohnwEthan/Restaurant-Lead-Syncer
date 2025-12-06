
export type OfferStatus = 'pending' | 'used';

export interface Customer {
  phone: string;
  name: string;
  status: OfferStatus;
  discount: number;
  lead_id?: string;      // New: Meta Lead ID
  meta_data?: string;    // New: Stringified JSON of other columns (Campaign, etc.)
  created_date: string;
  used_date?: string;
}

export interface VerificationResult {
  valid: boolean;
  message: string;
  customer?: Customer;
}

// Google Apps Script Global Types
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (result: any) => void) => {
            withFailureHandler: (callback: (error: Error) => void) => any;
          };
          [key: string]: any;
        };
      };
    };
  }
}
