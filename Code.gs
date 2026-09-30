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
  VALIDITY_YEARS: 1,
  ADMIN_PIN: "admin123"          // Change your secure Admin PIN here
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || '';

    let responseData = { status: 'error', message: 'Invalid action parameter' };

    if (action === 'getMember') {
      responseData = getMemberRecord(params.id);
    } else if (action === 'verifyMember') {
      responseData = getPublicVerificationRecord(params.id);
    } else if (action === 'adminLogin') {
      responseData = verifyAdminLogin(params.pin);
    } else if (action === 'getAdminData') {
      responseData = getAdminData(params.pin);
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
    const action = payload.action || '';

    let responseData = { status: 'error', message: 'Invalid POST action' };

    if (action === 'register') {
      responseData = processRegistration(payload);
    } else if (action === 'updateStatus') {
      responseData = updateMemberStatus(payload);
    }

    return buildJsonResponse(responseData);

  } catch (error) {
    return buildJsonResponse({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Process New Member Registration
 */
function processRegistration(data) {
  const sheet = getOrCreateSheet();

  // Safely Generate Next Sequential Membership ID (e.g. ORG-2026-0001)
  const nextId = generateNextMembershipId(sheet);

  // Upload Photo to Google Drive
  let photoUrl = "";
  if (data.photoBase64) {
    photoUrl = saveFileToDrive(data.photoBase64, `${nextId}_photo`, CONFIG.PHOTOS_FOLDER_NAME, CONFIG.PHOTOS_FOLDER_ID);
  }

  // Calculate Validity Dates
  const joiningDate = new Date(data.joiningDate || new Date());
  const validFrom = formatDate(joiningDate);
  
  const validUntilDate = new Date(joiningDate);
  validUntilDate.setFullYear(validUntilDate.getFullYear() + (CONFIG.VALIDITY_YEARS || 1));
  const validUntil = formatDate(validUntilDate);

  const timestamp = new Date().toISOString();
  const status = "Active";
  const cardUrl = ""; // Can be populated after client/server card rendering

  const registrationType = data.registrationType || "New Member";
  const nationality = data.nationality || "Indian";
  const residenceCountry = data.residenceCountry || "India";

  // Row columns matching exact database schema
  const rowData = [
    nextId,
    data.fullName || '',
    photoUrl,
    data.dob || '',
    data.gender || '',
    data.phone || '',
    data.whatsapp || '',
    data.email || '',
    data.address || '',
    data.district || '',
    data.state || '',
    data.pinCode || '',
    data.bloodGroup || '',
    data.membershipType || 'Standard',
    formatDate(joiningDate),
    validFrom,
    validUntil,
    timestamp,
    status,
    cardUrl,
    registrationType,
    nationality,
    residenceCountry
  ];

  sheet.appendRow(rowData);

  const memberRecord = {
    membershipId: nextId,
    fullName: data.fullName,
    photoUrl: photoUrl,
    dob: data.dob,
    gender: data.gender,
    nationality: nationality,
    residenceCountry: residenceCountry,
    phone: data.phone,
    whatsapp: data.whatsapp,
    email: data.email,
    address: data.address,
    district: data.district,
    state: data.state,
    pinCode: data.pinCode,
    bloodGroup: data.bloodGroup,
    membershipType: data.membershipType,
    joiningDate: formatDate(joiningDate),
    validFrom: validFrom,
    validUntil: validUntil,
    registrationTimestamp: timestamp,
    status: status,
    cardUrl: cardUrl,
    registrationType: registrationType
  };

  return {
    status: 'success',
    message: 'Member registered successfully!',
    data: memberRecord
  };
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
 * Get Full Member Record (For lookup)
 */
function getMemberRecord(query) {
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
  if (pin === CONFIG.ADMIN_PIN) {
    return { status: 'success', message: 'Admin authenticated' };
  }
  return { status: 'error', message: 'Invalid Admin PIN' };
}

/**
 * Fetch All Members for Admin Dashboard
 */
function getAdminData(pin) {
  if (pin !== CONFIG.ADMIN_PIN) {
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
  if (payload.pin !== CONFIG.ADMIN_PIN) {
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
    residenceCountry: row[22] || 'India'
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
      "Valid From", "Valid Until", "Registration Timestamp", "Membership Status", "Membership Card URL", "Registration Type", "Nationality", "Country of Residence"
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
