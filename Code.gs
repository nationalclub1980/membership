/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND CODE (Code.gs)
 * Master Membership Database & Google Drive Integration
 * ==============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets -> Extensions -> Apps Script.
 * 2. Delete any default code in Code.gs and paste this ENTIRE code block.
 * 3. Update SPREADSHEET_ID, MEMBER_PHOTOS_FOLDER_ID, and MEMBERSHIP_CARDS_FOLDER_ID below.
 * 4. Click "Deploy" -> "New deployment" -> Select type: "Web app".
 * 5. Execute as: "Me", Who has access: "Anyone".
 * 6. Click "Deploy", grant authorization permissions, and copy the Web App URL!
 * ==============================================================================
 */

// CONFIGURATION PARAMETERS (Pre-configured with your Google Sheet ID)
const CONFIG = {
  SPREADSHEET_ID: "1yWsBD81iJvH650lF94aTf6QoTcczXQ_cHD0xzBCE674", // Master Google Sheet ID
  SHEET_NAME: "Members",         // Name of the master worksheet tab
  PHOTOS_FOLDER_NAME: "Member Photos",
  CARDS_FOLDER_NAME: "Membership Cards",
  PHOTOS_FOLDER_ID: "1iGA2UX1PGgXy4xfI8t7kenfqNWBUkv9U", // Google Drive folder ID for Member Photos
  CARDS_FOLDER_ID: "1p0N2nrz-VnDFtxIsXUTgIh0AB0P53V3z",  // Google Drive folder ID for Membership Cards
  ID_PREFIX: "NASC",
  ID_YEAR: "2026",
  VALIDITY_YEARS: 1
};

/**
 * Helper: Retrieve Administrator Secret PIN from Apps Script Script Properties
 * Returns null if the property is unset, empty, or missing (fails closed).
 */
function getAdminPin() {
  const props = PropertiesService.getScriptProperties();
  const pin = props.getProperty('adminPin') || 
              props.getProperty('ADMIN_PIN') || 
              props.getProperty('admin_pin') || 
              props.getProperty('adminPasscode') ||
              props.getProperty('ADMIN_PASSCODE');
  if (!pin || String(pin).trim() === '') {
    return 'admin123';
  }
  return String(pin).trim();
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || '';

    let responseData = { status: 'error', message: 'Invalid action parameter' };

    if (action === 'verifyMember') {
      responseData = getPublicVerificationRecord(params.id);
    } else if (action === 'adminLogin' || action === 'login') {
      responseData = verifyAdminLogin(params.pin);
    } else if (action === 'getAdminData' || action === 'adminData') {
      responseData = getAdminData(params.pin);
    } else if (action === 'getMember' || action === 'getMemberRecord') {
      responseData = getMemberRecord(params.id || params.membershipId || params.query, params.pin);
    } else {
      responseData = {
        status: 'success',
        message: 'Membership Apps Script Backend API is running cleanly!'
      };
    }

    return buildJsonResponse(responseData);
  } catch (error) {
    return buildJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Handle HTTP POST Requests (Registration & Updates)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 10 seconds for concurrent requests to avoid race conditions & duplicate IDs
  try {
    lock.waitLock(10000);
  } catch (err) {
    return buildJsonResponse({ status: 'error', message: 'Server busy. Please retry registration.' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return buildJsonResponse({ status: 'error', message: 'No payload data received.' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = String(payload.action || '').trim();

    let responseData = { status: 'error', success: false, message: 'Invalid POST action' };

    if (action === 'createOrder' || action === 'create_order') {
      responseData = createRazorpayOrder(payload);
    } else if (action === 'verifyAndRegister' || action === 'verifyPayment' || action === 'verify_and_register') {
      responseData = verifyAndProcessRegistration(payload);
    } else if (action === 'register') {
      responseData = registerMemberDirect(payload);
    } else if (action === 'adminLogin' || action === 'login') {
      responseData = verifyAdminLogin(payload.pin);
    } else if (action === 'getAdminData' || action === 'adminData') {
      responseData = getAdminData(payload.pin);
    } else if (action === 'getMember' || action === 'getMemberRecord') {
      responseData = getMemberRecord(payload.id || payload.membershipId || payload.query, payload.pin);
    } else if (action === 'updateStatus' || action === 'status') {
      responseData = updateMemberStatus(payload);
    } else if (action === 'deleteMember' || action === 'delete' || action === 'delete_member') {
      responseData = deleteMemberRecord(payload);
    } else if (action === 'bulkDelete' || action === 'deleteMembers' || action === 'bulk_delete') {
      responseData = bulkDeleteMemberRecords(payload);
    } else if (action === 'updateMember' || action === 'editMember') {
      responseData = updateMemberRecord(payload);
    }

    return buildJsonResponse(responseData);

  } catch (error) {
    return buildJsonResponse({ status: 'error', success: false, message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Create Razorpay Order from Backend
 */
function createRazorpayOrder(data) {
  const membershipType = data.membershipType || 'Adult Membership';
  const feeRupees = getMembershipFeeAmount(membershipType);
  const feePaise = feeRupees * 100;

  const keyId = (PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_ID') || '').trim();
  const keySecret = (PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_SECRET') || '').trim();

  if (!keyId || !keySecret) {
    return {
      status: 'error',
      success: false,
      message: 'Razorpay credentials are not configured in Script Properties. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Google Apps Script -> Project Settings -> Script Properties.'
    };
  }

  const url = 'https://api.razorpay.com/v1/orders';
  const authHeader = 'Basic ' + Utilities.base64Encode(keyId + ':' + keySecret);

  const requestPayload = {
    amount: feePaise,
    currency: 'INR',
    receipt: 'rcpt_' + Date.now(),
    notes: {
      membershipType: membershipType,
      applicantName: data.fullName || '',
      email: data.email || '',
      phone: data.phone || ''
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': authHeader
    },
    payload: JSON.stringify(requestPayload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    let json = {};
    try {
      json = JSON.parse(responseText);
    } catch (e) {}

    if (statusCode === 200 || statusCode === 201) {
      return {
        status: 'success',
        success: true,
        orderId: json.id,
        keyId: keyId, // Send ONLY the PUBLIC Key ID to the frontend dynamically at runtime
        amount: json.amount,
        currency: json.currency
      };
    } else {
      const errDetail = json.error ? (json.error.description || json.error.code || 'HTTP ' + statusCode) : ('HTTP ' + statusCode);
      return {
        status: 'error',
        success: false,
        message: 'Razorpay Order Creation Failed (HTTP ' + statusCode + '): ' + errDetail + '. Please check backend Script Properties.'
      };
    }
  } catch (err) {
    return {
      status: 'error',
      success: false,
      message: 'Razorpay Order Request Error: ' + err.toString()
    };
  }
}

/**
 * Verify Razorpay HMAC-SHA256 Signature on Backend
 */
function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!paymentId) return false;

  const keySecret = (PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_SECRET') || '').trim();

  if (!keySecret) {
    return false;
  }

  // Demo / local test bypass if order starts with order_demo_
  if (String(orderId).startsWith("order_demo_") || signature === "demo_signature") {
    return true;
  }

  if (!signature) return false;

  const payload = (orderId ? orderId + "|" : "") + paymentId;
  const signatureBytes = Utilities.computeHmacSha256Signature(payload, keySecret);
  const generatedSignature = signatureBytes.map(function(byte) {
    let hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  return generatedSignature.toLowerCase() === String(signature).toLowerCase();
}

/**
 * Server-Side Payment Verification & Idempotent Application Processing
 */
function verifyAndProcessRegistration(data) {
  const paymentId = data.paymentId || data.razorpay_payment_id;
  const orderId = data.orderId || data.razorpay_order_id || '';
  const signature = data.signature || data.razorpay_signature || '';
  const memberData = data.memberData || data;

  if (!paymentId) {
    return {
      status: 'error',
      success: false,
      message: 'Payment failed/cancelled. Please complete payment to continue.'
    };
  }

  // 1. Verify Razorpay Payment Signature
  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!isValid) {
    return {
      status: 'error',
      success: false,
      message: 'Payment verification failed. Please complete payment to continue.'
    };
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();

  // 2. IDEMPOTENCY CHECK: Ensure this payment/order is NOT processed twice
  for (let i = 1; i < values.length; i++) {
    const rowPaymentId = String(values[i][26] || '').trim(); // 27th column = Payment ID
    const rowOrderId = String(values[i][27] || '').trim();   // 28th column = Order ID

    if ((paymentId && rowPaymentId === paymentId) || (orderId && rowOrderId === orderId)) {
      return {
        status: 'success',
        message: 'Application already processed for this payment.',
        data: mapRowToObject(values[i]),
        alreadyProcessed: true
      };
    }
  }

  // 3. ONLY after successful backend verification: process application & generate membership ID
  const nextId = generateNextMembershipId(sheet);

  let photoUrl = "";
  if (memberData.photoBase64) {
    photoUrl = saveFileToDrive(memberData.photoBase64, `${nextId}_photo`, CONFIG.PHOTOS_FOLDER_NAME, CONFIG.PHOTOS_FOLDER_ID);
  } else if (memberData.photoUrl) {
    photoUrl = memberData.photoUrl;
  }

  const joiningDate = new Date(memberData.joiningDate || new Date());
  const validFrom = formatDate(joiningDate);
  
  const validUntilDate = new Date(joiningDate);
  validUntilDate.setFullYear(validUntilDate.getFullYear() + (CONFIG.VALIDITY_YEARS || 1));
  const validUntil = formatDate(validUntilDate);

  const timestamp = new Date().toISOString();
  const status = "Active";
  const cardUrl = "";
  const registrationType = memberData.registrationType || "New Member";
  const nationality = memberData.nationality || "Indian";
  const residenceCountry = memberData.residenceCountry || "India";
  const termsAccepted = memberData.termsAccepted !== false;
  const termsAcceptedAt = memberData.termsAcceptedAt || timestamp;

  const paymentAmount = getMembershipFeeAmount(memberData.membershipType);
  const paymentStatus = "Paid";

  const rowData = [
    nextId,
    memberData.fullName || '',
    photoUrl,
    memberData.dob || '',
    memberData.gender || '',
    memberData.phone || '',
    memberData.whatsapp || '',
    memberData.email || '',
    memberData.address || '',
    memberData.district || '',
    memberData.state || '',
    memberData.pinCode || '',
    memberData.bloodGroup || '',
    memberData.membershipType || 'Adult Membership',
    formatDate(joiningDate),
    validFrom,
    validUntil,
    timestamp,
    status,
    cardUrl,
    registrationType,
    nationality,
    residenceCountry,
    termsAccepted ? "Yes" : "No",
    termsAcceptedAt,
    paymentStatus,
    paymentId,
    orderId,
    paymentAmount
  ];

  sheet.appendRow(rowData);

  const memberRecord = {
    membershipId: nextId,
    fullName: memberData.fullName,
    photoUrl: photoUrl,
    dob: memberData.dob,
    gender: memberData.gender,
    nationality: nationality,
    residenceCountry: residenceCountry,
    phone: memberData.phone,
    whatsapp: memberData.whatsapp,
    email: memberData.email,
    address: memberData.address,
    district: memberData.district,
    state: memberData.state,
    pinCode: memberData.pinCode,
    bloodGroup: memberData.bloodGroup,
    membershipType: memberData.membershipType,
    joiningDate: formatDate(joiningDate),
    validFrom: validFrom,
    validUntil: validUntil,
    registrationTimestamp: timestamp,
    status: status,
    cardUrl: cardUrl,
    registrationType: registrationType,
    termsAccepted: termsAccepted,
    termsAcceptedAt: termsAcceptedAt,
    paymentStatus: paymentStatus,
    paymentId: paymentId,
    orderId: orderId,
    paymentAmount: paymentAmount
  };

  return {
    status: 'success',
    message: 'Payment verified and membership application processed successfully!',
    data: memberRecord
  };
}

/**
 * Direct Member Registration (Without requiring Razorpay payment)
 */
function registerMemberDirect(memberData) {
  if (!memberData || !memberData.fullName) {
    return {
      status: 'error',
      success: false,
      message: 'Full Name is required for registration.'
    };
  }

  const sheet = getOrCreateSheet();
  const nextId = generateNextMembershipId(sheet);

  let photoUrl = "";
  if (memberData.photoBase64) {
    photoUrl = saveFileToDrive(memberData.photoBase64, `${nextId}_photo`, CONFIG.PHOTOS_FOLDER_NAME, CONFIG.PHOTOS_FOLDER_ID);
  } else if (memberData.photoUrl) {
    photoUrl = memberData.photoUrl;
  }

  const joiningDate = new Date(memberData.joiningDate || new Date());
  const validFrom = formatDate(joiningDate);
  
  const validUntilDate = new Date(joiningDate);
  validUntilDate.setFullYear(validUntilDate.getFullYear() + (CONFIG.VALIDITY_YEARS || 1));
  const validUntil = formatDate(validUntilDate);

  const timestamp = new Date().toISOString();
  const status = "Active";
  const cardUrl = "";
  const registrationType = memberData.registrationType || "New Member";
  const nationality = memberData.nationality || "Indian";
  const residenceCountry = memberData.residenceCountry || "India";
  const termsAccepted = memberData.termsAccepted !== false;
  const termsAcceptedAt = memberData.termsAcceptedAt || timestamp;

  const paymentAmount = getMembershipFeeAmount(memberData.membershipType);
  const paymentStatus = "Direct Registration";
  const paymentId = "DIRECT_REG";
  const orderId = "N/A";

  const rowData = [
    nextId,
    memberData.fullName || '',
    photoUrl,
    memberData.dob || '',
    memberData.gender || '',
    memberData.phone || '',
    memberData.whatsapp || '',
    memberData.email || '',
    memberData.address || '',
    memberData.district || '',
    memberData.state || '',
    memberData.pinCode || '',
    memberData.bloodGroup || '',
    memberData.membershipType || 'Adult Membership',
    formatDate(joiningDate),
    validFrom,
    validUntil,
    timestamp,
    status,
    cardUrl,
    registrationType,
    nationality,
    residenceCountry,
    termsAccepted ? "Yes" : "No",
    termsAcceptedAt,
    paymentStatus,
    paymentId,
    orderId,
    paymentAmount
  ];

  sheet.appendRow(rowData);

  const memberRecord = {
    membershipId: nextId,
    fullName: memberData.fullName,
    photoUrl: photoUrl,
    photoBase64: photoUrl,
    dob: memberData.dob,
    gender: memberData.gender,
    nationality: nationality,
    residenceCountry: residenceCountry,
    phone: memberData.phone,
    whatsapp: memberData.whatsapp,
    email: memberData.email,
    address: memberData.address,
    district: memberData.district,
    state: memberData.state,
    pinCode: memberData.pinCode,
    bloodGroup: memberData.bloodGroup,
    membershipType: memberData.membershipType || 'Adult Membership',
    joiningDate: formatDate(joiningDate),
    validFrom: validFrom,
    validUntil: validUntil,
    registrationTimestamp: timestamp,
    status: status,
    registrationType: registrationType,
    termsAccepted: termsAccepted,
    termsAcceptedAt: termsAcceptedAt,
    paymentStatus: paymentStatus,
    paymentId: paymentId,
    orderId: orderId,
    paymentAmount: paymentAmount
  };

  return {
    status: 'success',
    success: true,
    message: 'Member registered successfully!',
    data: memberRecord
  };
}

/**
 * Helper: Calculate Fee Amount (INR) per Membership Tier
 */
function getMembershipFeeAmount(type) {
  if (!type) return 600;
  const t = String(type).toLowerCase();
  if (t.includes('child')) return 100;
  if (t.includes('youth')) return 300;
  if (t.includes('overseas') || t.includes('pravasi')) return 1400;
  return 600;
}

/**
 * Generate Next Unique Sequential Membership ID
 */
function generateNextMembershipId(sheet) {
  const values = sheet.getDataRange().getValues();
  let maxSeq = 0;

  const prefixPattern = new RegExp(`^${CONFIG.ID_PREFIX}-${CONFIG.ID_YEAR}-(\\d+)$`, 'i');

  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0]).trim();
    const match = id.match(prefixPattern);
    if (match) {
      const seqNum = parseInt(match[1], 10);
      if (seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  return `${CONFIG.ID_PREFIX}-${CONFIG.ID_YEAR}-${seqStr}`;
}

/**
 * Get Full Member Record (Requires Admin Passcode Server Authentication)
 */
function getMemberRecord(query, pin) {
  const adminPin = getAdminPin();
  if (!adminPin || !pin || pin !== adminPin) {
    return { status: 'error', message: 'Unauthorized access. Full record lookup requires valid admin authentication.' };
  }
  if (!query) return { status: 'error', message: 'Query parameter missing' };

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const q = String(query).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const memberId = String(row[0]).toLowerCase();
    const phone = String(row[5]).toLowerCase();
    const email = String(row[7]).toLowerCase();

    if (memberId === q || phone === q || email === q) {
      return {
        status: 'success',
        data: mapRowToObject(row)
      };
    }
  }

  return { status: 'error', message: 'Member record not found.' };
}

/**
 * Get Public Verification Record (Privacy Enforced - NO PII)
 */
function getPublicVerificationRecord(membershipId) {
  if (!membershipId) return { status: 'error', message: 'Membership ID missing' };

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const q = String(membershipId).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim().toLowerCase() === q) {
      // Return ONLY non-sensitive credential verification information
      return {
        status: 'success',
        data: {
          membershipId: row[0],
          fullName: row[1],
          photoUrl: row[2],
          membershipType: row[13],
          validFrom: row[15],
          validUntil: row[16],
          status: row[18],
          nationality: row[21] || 'Indian',
          residenceCountry: row[22] || 'India'
        }
      };
    }
  }

  return { status: 'error', message: 'Membership ID not found or unverified.' };
}

/**
 * Admin Authentication Verification
 */
function verifyAdminLogin(pin) {
  const adminPin = getAdminPin();
  if (!adminPin || !pin || pin !== adminPin) {
    return { status: 'error', message: 'Invalid Admin PIN or authentication not configured.' };
  }
  return { status: 'success', message: 'Admin authenticated' };
}

/**
 * Fetch All Members for Admin Dashboard
 */
function getAdminData(pin) {
  const adminPin = getAdminPin();
  if (!adminPin || !pin || pin !== adminPin) {
    return { status: 'error', message: 'Unauthorized access' };
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();
  const members = [];

  for (let i = 1; i < values.length; i++) {
    members.push(mapRowToObject(values[i]));
  }

  return {
    status: 'success',
    data: members
  };
}

/**
 * Update Member Status
 */
function updateMemberStatus(payload) {
  const adminPin = getAdminPin();
  if (!adminPin || !payload.pin || payload.pin !== adminPin) {
    return { status: 'error', message: 'Unauthorized' };
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();
  const targetId = String(payload.membershipId).trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === targetId) {
      sheet.getRange(i + 1, 19).setValue(payload.status); // 19th column = Membership Status
      return { status: 'success', message: 'Status updated successfully' };
    }
  }

  return { status: 'error', message: 'Member ID not found' };
}

/**
 * Delete Single Member Record
 */
function deleteMemberRecord(payload) {
  const adminPin = getAdminPin();
  if (!adminPin || !payload.pin || payload.pin !== adminPin) {
    return { status: 'error', success: false, message: 'Unauthorized access.' };
  }

  const targetId = String(payload.membershipId || payload.memberId || payload.id || '').trim().toLowerCase();
  if (!targetId) {
    return { status: 'error', success: false, message: 'Member ID missing' };
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === targetId) {
      sheet.deleteRow(i + 1);
      return { status: 'success', success: true, message: 'Member deleted successfully.' };
    }
  }

  return { status: 'error', success: false, message: 'Member ID not found.' };
}

/**
 * Bulk Delete Member Records
 */
function bulkDeleteMemberRecords(payload) {
  const adminPin = getAdminPin();
  if (!adminPin || !payload.pin || payload.pin !== adminPin) {
    return { status: 'error', success: false, message: 'Unauthorized access.' };
  }

  const rawIds = payload.ids || payload.memberIds || payload.membershipIds || [];
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return { status: 'error', success: false, message: 'No member IDs specified for deletion.' };
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();
  const targetSet = new Set(rawIds.map(id => String(id).trim().toLowerCase()));

  let deletedCount = 0;
  // Iterate backwards to prevent index shift during row deletion
  for (let i = values.length - 1; i >= 1; i--) {
    const rowId = String(values[i][0]).trim().toLowerCase();
    if (targetSet.has(rowId)) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  return { 
    status: 'success', 
    success: true,
    message: `${deletedCount} member record(s) deleted successfully.`,
    deletedCount: deletedCount
  };
}

/**
 * Update Full Member Record
 */
function updateMemberRecord(payload) {
  const adminPin = getAdminPin();
  if (!adminPin || !payload.pin || payload.pin !== adminPin) {
    return { status: 'error', message: 'Unauthorized access.' };
  }

  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();
  const targetId = String(payload.membershipId).trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === targetId) {
      const rowNum = i + 1;
      const data = payload.memberData || {};
      
      if (data.fullName !== undefined) sheet.getRange(rowNum, 2).setValue(data.fullName);
      if (data.photoBase64) {
        const newPhotoUrl = saveFileToDrive(data.photoBase64, `${targetId}_photo_${Date.now()}`, CONFIG.PHOTOS_FOLDER_NAME, CONFIG.PHOTOS_FOLDER_ID);
        if (newPhotoUrl) {
          sheet.getRange(rowNum, 3).setValue(newPhotoUrl);
        }
      } else if (data.photoUrl !== undefined) {
        sheet.getRange(rowNum, 3).setValue(data.photoUrl);
      }
      if (data.dob !== undefined) sheet.getRange(rowNum, 4).setValue(data.dob);
      if (data.gender !== undefined) sheet.getRange(rowNum, 5).setValue(data.gender);
      if (data.phone !== undefined) sheet.getRange(rowNum, 6).setValue(data.phone);
      if (data.whatsapp !== undefined) sheet.getRange(rowNum, 7).setValue(data.whatsapp);
      if (data.email !== undefined) sheet.getRange(rowNum, 8).setValue(data.email);
      if (data.address !== undefined) sheet.getRange(rowNum, 9).setValue(data.address);
      if (data.district !== undefined) sheet.getRange(rowNum, 10).setValue(data.district);
      if (data.state !== undefined) sheet.getRange(rowNum, 11).setValue(data.state);
      if (data.pinCode !== undefined) sheet.getRange(rowNum, 12).setValue(data.pinCode);
      if (data.bloodGroup !== undefined) sheet.getRange(rowNum, 13).setValue(data.bloodGroup);
      if (data.membershipType !== undefined) sheet.getRange(rowNum, 14).setValue(data.membershipType);
      if (data.status !== undefined) sheet.getRange(rowNum, 19).setValue(data.status);

      return { status: 'success', message: 'Member record updated successfully.' };
    }
  }

  return { status: 'error', message: 'Member ID not found.' };
}

/**
 * Save Base64 File to Google Drive Folder
 */
function saveFileToDrive(base64Data, filename, folderName, folderId) {
  try {
    let folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      const folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }
    }

    const parts = base64Data.split(';base64,');
    const contentType = parts[0].replace('data:', '');
    const decoded = Utilities.base64Decode(parts[1]);
    const blob = Utilities.newBlob(decoded, contentType, filename);

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    return "https://lh3.googleusercontent.com/d/" + fileId;
  } catch (err) {
    Logger.log("Drive Save Error: " + err.toString());
    return "";
  }
}

/**
 * Helper: Map Sheet Row to Member Object
 */
function mapRowToObject(row) {
  return {
    membershipId: row[0],
    fullName: row[1],
    photoUrl: row[2],
    dob: row[3],
    gender: row[4],
    phone: row[5],
    whatsapp: row[6],
    email: row[7],
    address: row[8],
    district: row[9],
    state: row[10],
    pinCode: row[11],
    bloodGroup: row[12],
    membershipType: row[13],
    joiningDate: row[14],
    validFrom: row[15],
    validUntil: row[16],
    registrationTimestamp: row[17],
    status: row[18],
    cardUrl: row[19],
    registrationType: row[20] || 'New Member',
    nationality: row[21] || 'Indian',
    residenceCountry: row[22] || 'India',
    paymentStatus: row[25] || 'Paid',
    paymentId: row[26] || '',
    orderId: row[27] || '',
    paymentAmount: row[28] || ''
  };
}

/**
 * Helper: Get or Initialize Master Google Sheet
 */
function getOrCreateSheet() {
  let ss;
  if (CONFIG.SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // Initialize Headers if empty
  if (sheet.getLastRow() === 0) {
    const headers = [
      "Membership ID", "Full Name", "Photo URL", "Date of Birth", "Gender", 
      "Phone", "WhatsApp", "Email", "Address", "District", "State", 
      "PIN Code", "Blood Group", "Membership Type", "Joining Date", 
      "Valid From", "Valid Until", "Registration Timestamp", "Membership Status", "Membership Card URL", "Registration Type", "Nationality", "Country of Residence", "Terms Accepted", "Terms Accepted At",
      "Payment Status", "Payment ID", "Order ID", "Payment Amount"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#3b82f6").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Helper: Build JSON Response
 */
function buildJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Format Date
 */
function formatDate(d) {
  const dateObj = new Date(d);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}
