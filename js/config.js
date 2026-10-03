/**
 * APPLICATION CONFIGURATION FILE
 * Edit the variables below to customize the organization and connect to Google Apps Script.
 */

const CONFIG = {
  // 1. Backend Google Apps Script Web App URL
  // Replace the placeholder below with your deployed Apps Script Executable URL!
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwkhsWWLZ1gYhrSAE-3MZ3thl9SApnz3Dr1SlLHxZYI5paXMYpG8p1HUDLyRcdkFNVQ/exec", 

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

  // Club Leadership
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
    { id: "Child Membership", name: "Child Membership (Up to 15 Years)", fee: "₹100 / Year", badgeBg: "linear-gradient(135deg, #0ea5e9, #0284c7)" },
    { id: "Youth Membership", name: "Youth Membership (15–25 Years)", fee: "₹300 / Year", badgeBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
    { id: "Adult Membership", name: "Adult Membership (Above 25 Years)", fee: "₹600 / Year", badgeBg: "linear-gradient(135deg, #10b981, #047857)" },
    { id: "Overseas / Pravasi Membership", name: "Overseas / Pravasi Membership", fee: "AED 60 / Year", badgeBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }
  ],

  // 6. Local Offline Demo Passcode (Used ONLY when WEB_APP_URL is unconfigured for local testing)
  // When WEB_APP_URL is connected, admin PIN authentication is enforced strictly on the Apps Script backend.
  DEMO_ONLY_PASSCODE: "admin123",

  // 7. Demo Mode Setting
  ENABLE_DEMO_FALLBACK: true
};

// Freeze config object to prevent accidental mutation at runtime
Object.freeze(CONFIG);
