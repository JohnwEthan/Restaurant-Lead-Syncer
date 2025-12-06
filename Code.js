
// --- CONFIGURATION ---
const SPREADSHEET_ID = '1jOZ_t0k3nGCq5Ku5jYJaStM8LZ6GRJ0lmueBpHNWt4A';

// TAB NAMES (Must match your Google Sheet tabs exactly)
const TAB_LEADS = 'Leads';   // Source: Where Meta adds new leads
const TAB_VISITS = 'Visits'; // Destination: Where we log visits/purchases

// META CAPI SETTINGS (Get these from Facebook Events Manager)
const META_PIXEL_ID = 'YOUR_PIXEL_ID_HERE'; 
const META_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'; 

// --- HANDLERS ---

function doGet(e) {
  const action = (e && e.parameter) ? e.parameter.action : '';
  
  try {
    if (action === 'getData') {
      const data = getAllData();
      return ContentService.createTextOutput(data)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', time: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Restaurant Offer Checker')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (err) {
    if (action === 'getData' || action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return HtmlService.createHtmlOutput("Error: " + err.toString());
  }
}

function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
       payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
       payload = e.parameter;
    }

    if (!payload) {
       return ContentService.createTextOutput(JSON.stringify({ success: false, error: "No payload received" }))
         .setMimeType(ContentService.MimeType.JSON);
    }

    const success = markAsUsed(
      payload.phone, 
      payload.purchaseValue, 
      payload.eventId, 
      payload.leadId, 
      payload.metaData
    );
    
    return ContentService.createTextOutput(JSON.stringify({ success: success }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- API METHODS ---

function getAllData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Get VISITS (Used offers)
    // Visits Tab: Phone is in Column A (Index 0)
    let visitsSet = new Set(); 
    let visitsSheet = ss.getSheetByName(TAB_VISITS);
    
    if (visitsSheet && visitsSheet.getLastRow() > 1) {
      const visitData = visitsSheet.getDataRange().getValues();
      for (let i = 1; i < visitData.length; i++) {
        // Normalize visited phone numbers
        const p = String(visitData[i][0]).replace(/\D/g, ''); 
        if (p) visitsSet.add(p);
      }
    }

    // 2. Get LEADS (Source of Truth)
    const leadsSheet = ss.getSheetByName(TAB_LEADS);
    if (!leadsSheet) {
      throw new Error(`Sheet "${TAB_LEADS}" not found. Please check tab name.`);
    }

    const leadsData = leadsSheet.getDataRange().getValues();
    if (leadsData.length <= 1) return JSON.stringify([]); // No data

    // --- SMART COLUMN MAPPING ---
    // Normalize headers to snake_case (e.g., "Phone Number" -> "phone_number")
    const headers = leadsData[0].map(h => String(h).toLowerCase().trim().replace(/[\s\W]+/g, '_'));
    
    // Explicitly look for 'phone_number' (Column P in your sheet)
    let colPhone = headers.indexOf('phone_number');
    // Fallbacks
    if (colPhone === -1) colPhone = headers.indexOf('phone');
    if (colPhone === -1) colPhone = headers.indexOf('mobile');
    if (colPhone === -1) colPhone = headers.findIndex(h => h.includes('phone')); // Last resort

    let colName = headers.indexOf('full_name');
    if (colName === -1) colName = headers.findIndex(h => h.includes('name'));

    let colLeadId = headers.indexOf('id');
    if (colLeadId === -1) colLeadId = headers.indexOf('lead_id');
    
    // DEBUG: If phone column missing, return error in JSON so App knows
    if (colPhone === -1) {
      throw new Error(`Column 'phone_number' not found. Found headers: ${headers.join(', ')}`);
    }

    const output = [];
    const processedPhones = new Set();

    for (let i = 1; i < leadsData.length; i++) {
      const row = leadsData[i];
      const rawPhone = String(row[colPhone] || '');
      
      // Normalize: Remove non-digits
      const phone = rawPhone.replace(/\D/g, ''); 

      // Skip invalid/duplicates
      // Ensure at least 8 digits to avoid junk data
      if (!phone || phone.length < 8 || processedPhones.has(phone)) continue;
      processedPhones.add(phone);

      // Check if this person has visited
      const isUsed = visitsSet.has(phone);

      // Gather Metadata (Campaign info, etc)
      const metaObj = {};
      headers.forEach((h, idx) => {
        if (idx !== colPhone && idx !== colName && idx !== colLeadId) {
          // Store simplified values to save space
          const val = row[idx];
          if (val && String(val).trim() !== '') {
             metaObj[h] = val;
          }
        }
      });

      output.push({
        phone: phone,
        name: colName !== -1 ? row[colName] : 'Customer',
        status: isUsed ? 'used' : 'pending',
        discount: 0, 
        lead_id: colLeadId !== -1 ? row[colLeadId] : '',
        meta_data: JSON.stringify(metaObj),
        created_date: '', 
        used_date: isUsed ? 'Previously' : ''
      });
    }

    return JSON.stringify(output);
  } catch (e) {
    throw new Error("Sheet Error: " + e.toString());
  }
}

function markAsUsed(phoneNumber, purchaseValue, eventId, leadId, metaData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let visitsSheet = ss.getSheetByName(TAB_VISITS);
    if (!visitsSheet) visitsSheet = ss.insertSheet(TAB_VISITS);
    
    const targetPhone = String(phoneNumber).replace(/\D/g, '');
    
    // Check duplicates in Visits sheet (Column A)
    const existing = visitsSheet.getDataRange().getValues();
    for(let i=1; i<existing.length; i++) {
       if (String(existing[i][0]).replace(/\D/g, '') === targetPhone) {
         // Already recorded, but return true so UI shows success
         return true; 
       }
    }

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    const isPurchase = purchaseValue && Number(purchaseValue) > 0;
    const eventName = isPurchase ? 'Purchase' : 'Contact';
    
    visitsSheet.appendRow([
      targetPhone,           // A: Phone
      '',                    // B: Name
      'used',                // C: Status
      leadId || '',          // D: Lead ID
      today,                 // E: Date
      isPurchase ? purchaseValue : '', // F: Value
      isPurchase ? 'INR' : '',         // G: Currency
      eventId || '',         // H: Event ID
      eventName,             // I: Event Name
      hashString(targetPhone), // J: Hashed Phone
      metaData || ''         // K: Meta Data
    ]);

    // Send to CAPI
    if (META_PIXEL_ID && META_ACCESS_TOKEN && META_PIXEL_ID !== 'YOUR_PIXEL_ID_HERE') {
      sendToMetaCAPI({
        eventName: eventName,
        eventTime: Math.floor(Date.now() / 1000),
        eventId: eventId,
        phone: targetPhone, 
        leadId: leadId,
        value: isPurchase ? Number(purchaseValue) : undefined,
        currency: 'INR'
      });
    }

    return true;

  } catch (e) {
    Logger.log("Error: " + e.toString());
    return false;
  } finally {
    lock.releaseLock();
  }
}

function sendToMetaCAPI(data) {
  const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;
  
  const userData = { ph: [hashString(data.phone)] };
  if (data.leadId) userData.lead_id = data.leadId;

  const customData = {};
  if (data.eventName === 'Purchase') {
    customData.value = data.value;
    customData.currency = data.currency;
  }
  
  const payload = {
    data: [{
      event_name: data.eventName,
      event_time: data.eventTime,
      event_id: data.eventId,
      action_source: 'physical_store',
      user_data: userData,
      custom_data: customData
    }]
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('CAPI Error: ' + e.toString());
  }
}

function hashString(input) {
  if (!input) return '';
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length == 1) txtHash += '0';
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}
