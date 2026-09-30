/**
 * APPLICATION CONFIGURATION FILE
 * Edit the variables below to customize the organization and connect to Google Apps Script.
 */

const CONFIG = {
  // 1. Backend Google Apps Script Web App URL
  // Replace the placeholder below with your deployed Apps Script Executable URL!
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbw-VR6_0mk7LPT3PgXReyHyKsV1U-TtuGCiZm6k9za41o_ZXm8Z09P9Ll5czuf55F8-/exec", 

  // 2. Organization Information & Official Leadership
  ORG_NAME: "NATIONAL ARTS & SPORTS CLUB",
  ORG_SHORT_NAME: "NASC",
  ORG_TAGLINE: "(Reg. No. 75/2000). (Affiliated to Nehru Yuvakendra, Reg. No. NYKK-4912/KNG/630/2015-16)",
  ORG_SINCE: "1980",
  ORG_LOGO: "assets/club-logo.png",
  ORG_ADDRESS: "Millath Nagar, Udma Padinhar (P.O), 671 319, Kasaragod District, Kerala, India",
  ORG_EMAIL: "nationalculb1980@gmail.com",
  ORG_PHONE: "+91 87142 10696",
  ORG_INSTAGRAM: "@national_millathnagar_udmawest",
  ORG_INSTAGRAM_URL: "https://www.instagram.com/national_millathnagar_udmawest",

  // Executive Committee Leadership
  PRESIDENT_NAME: "Abdulla PK",
  PRESIDENT_PHONE: "+91 87142 10696",
  SECRETARY_NAME: "Mujeeb Rahman Kaniyil",
  SECRETARY_PHONE: "+91 98467 91909",

  // 3. Membership ID Format Options
  // Generated Format: [ID_PREFIX]-[ID_YEAR]-[SEQUENTIAL_NUMBER] (e.g. NASC-2026-0001)
  ID_PREFIX: "NASC",
  ID_YEAR: "2026",
  ID_DIGITS: 4, // Number of padded zeros (e.g., 4 -> 0001)

  // 4. Default Membership Validity
  DEFAULT_VALIDITY_YEARS: 1, // 1 Year membership validity by default

  // 5. Membership Types Available
  MEMBERSHIP_TYPES: [
    { id: "Standard", name: "Standard Member", fee: "$25 / year", badgeBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
    { id: "Premium", name: "Premium Member", fee: "$50 / year", badgeBg: "linear-gradient(135deg, #f59e0b, #d97706)" },
    { id: "Executive", name: "Executive Member", fee: "$100 / year", badgeBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
    { id: "Lifetime", name: "Lifetime Member", fee: "$500 one-time", badgeBg: "linear-gradient(135deg, #10b981, #047857)" }
  ],

  // 6. Admin Panel Default Passcode (Checked on frontend & verified by Apps Script)
  ADMIN_DEFAULT_PIN: "admin123",

  // 7. Demo Mode Setting
  // If WEB_APP_URL is empty, system automatically operates in Client Demo Mode
  // saving records in browser LocalStorage so you can test immediately!
  ENABLE_DEMO_FALLBACK: true
};

// Freeze config object to prevent accidental mutation at runtime
Object.freeze(CONFIG);
