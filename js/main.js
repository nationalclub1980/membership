/**
 * MAIN UTILITIES AND GLOBAL APP INITIALIZATION
 */

document.addEventListener('DOMContentLoaded', () => {
  initOrgBranding();
  initMobileNav();
  initTextSizeController();
  initLanguageController();
  checkConfigState();
});

/**
 * Text Size Accessibility Controller (Normal | Large | Extra Large)
 */
function initTextSizeController() {
  const savedSize = sessionStorage.getItem('nasc_text_size') || 'normal';
  applyTextSize(savedSize);

  document.querySelectorAll('.btn-text-size').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const size = e.currentTarget.dataset.size;
      if (size) {
        applyTextSize(size);
        sessionStorage.setItem('nasc_text_size', size);
      }
    });
  });
}

function applyTextSize(size) {
  document.documentElement.dataset.textSize = size;
  document.querySelectorAll('.btn-text-size').forEach(b => {
    b.classList.toggle('active', b.dataset.size === size);
  });
}

/**
 * Multi-Language (i18n) Controller (English | മലയാളം | ಕನ್ನಡ)
 */
const I18N = {
  en: {
    nav_home: "Home",
    nav_membership: "Membership",
    nav_verify: "Verify Membership",
    nav_about: "About",
    nav_contact: "Contact",
    campaign_announcement: "2026 MEMBERSHIP CAMPAIGN NOW OPEN",
    hero_title: "Join National Arts & Sports Club",
    hero_subtitle: "Become a member of our community and take part in arts, sports and social activities.",
    card_become_title: "BECOME A MEMBER",
    card_become_desc: "Register as a new club member and obtain your official digital membership card.",
    btn_become: "Register New Member ➔",
    card_existing_title: "EXISTING MEMBER",
    card_existing_desc: "Access your existing membership, renew, or retrieve your card.",
    btn_existing: "Renew Membership ➔",
    card_verify_title: "VERIFY MEMBERSHIP",
    card_verify_desc: "Check membership credential validity and official status.",
    btn_verify: "Verify Membership ➔",
    quick_access_title: "Quick Access Links",
    org_tagline_text: "(Reg. No. 75/2000). (Affiliated to Nehru Yuvakendra, Reg. No. NYKK-4912/KNG/630/2015-16)",
    org_address_text: "Millath Nagar, Udma Padinhar (P.O), 671 319, Kasaragod"
  },
  ml: {
    nav_home: "ഹോം",
    nav_membership: "അംഗത്വം",
    nav_verify: "അംഗത്വം പരിശോധിക്കുക",
    nav_about: "ഞങ്ങളെക്കുറിച്ച്",
    nav_contact: "ബന്ധപ്പെടുക",
    campaign_announcement: "2026 അംഗത്വ ക്യാമ്പയിൻ ആരംഭിച്ചു",
    hero_title: "നാഷണൽ ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബിൽ അംഗമാകുക",
    hero_subtitle: "ഞങ്ങളുടെ കമ്മ്യൂണിറ്റിയുടെ ഭാഗമായി കലാ കായിക സാമൂഹിക പ്രവർത്തനങ്ങളിൽ പങ്കാളികളാകൂ.",
    card_become_title: "പുതിയ അംഗത്വം",
    card_become_desc: "പുതിയ ക്ലബ്ബ് അംഗമായി രജിസ്റ്റർ ചെയ്ത് ഡിജിറ്റൽ കാർഡ് നേടുക.",
    btn_become: "അംഗമാകുക ➔",
    card_existing_title: "നിലവിലുള്ള അംഗം",
    card_existing_desc: "നിങ്ങളുടെ അംഗത്വം പുതുക്കുക അല്ലെങ്കിൽ കാർഡ് ഡൗൺലോഡ് ചെയ്യുക.",
    btn_existing: "അംഗത്വം പുതുക്കുക ➔",
    card_verify_title: "അംഗത്വം സ്ഥിരീകരിക്കുക",
    card_verify_desc: "അംഗത്വ വിവരങ്ങളും കാർഡ് സ്റ്റാറ്റസും പരിശോധിക്കുക.",
    btn_verify: "പരിശോധിക്കുക ➔",
    quick_access_title: "ദ്രുത ലിങ്കുകൾ",
    org_tagline_text: "(രജി. നമ്പർ 75/2000). (നെഹ്റു യുവകേന്ദ്ര അഫിലിയേറ്റഡ്, രജി. നമ്പർ NYKK-4912/KNG/630/2015-16)",
    org_address_text: "മില്ലത്ത് നഗർ, ഉദുമ പടിഞ്ഞാറ് (P.O), 671 319, കാസർഗോഡ്"
  },
  kn: {
    nav_home: "ಮುಖಪುಟ",
    nav_membership: "ಸದಸ್ಯತ್ವ",
    nav_verify: "ಸದಸ್ಯತ್ವ ಪರಿಶೀಲಿಸಿ",
    nav_about: "ನಮ್ಮ ಬಗ್ಗೆ",
    nav_contact: "ಸಂಪರ್ಕಿಸಿ",
    campaign_announcement: "2026 ಸದಸ್ಯತ್ವ ಅಭಿಯಾನ ಆರಂಭಗೊಂಡಿದೆ",
    hero_title: "ನ್ಯಾಷನಲ್ ಆರ್ಟ್ಸ್ & ಸ್ಪೋರ್ಟ್ಸ್ ಕ್ಲಬ್ ಸೇರಿ",
    hero_subtitle: "ನಮ್ಮ ಸಮುದಾಯದ ಸದಸ್ಯರಾಗಿ ಕಲೆ, ಕ್ರೀಡೆ ಮತ್ತು ಸಾಮಾಜಿಕ ಚಟುವಟಿಕೆಗಳಲ್ಲಿ ಭಾಗವಹಿಸಿ.",
    card_become_title: "ಹೊಸ ಸದಸ್ಯತ್ವ",
    card_become_desc: "ಹೊಸ ಕ್ಲಬ್ ಸದಸ್ಯರಾಗಿ ನೋಂದಾಯಿಸಿ ಮತ್ತು ಡಿಜಿറ്റಲ್ ಕಾರ್ಡ್ ಪಡೆಯಿರಿ.",
    btn_become: "ಸದಸ್ಯರಾಗಿ ➔",
    card_existing_title: "ಹಾಲಿ ಸದಸ್ಯರು",
    card_existing_desc: "ನಿಮ್ಮ ಸದಸ್ಯತ್ವವನ್ನು ನವೀಕರಿಸಿ ಅಥವಾ ಕಾರ್ಡ್ ಪಡೆಯಿರಿ.",
    btn_existing: "ಸದಸ್ಯತ್ವ ನವೀಕರಿಸಿ ➔",
    card_verify_title: "ಸದಸ್ಯತ್ವ ಪರಿಶೀಲಿಸಿ",
    card_verify_desc: "ಸದಸ್ಯತ್ವದ ವಿವರಗಳು ಮತ್ತು ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
    btn_verify: "ಪರಿಶೀಲಿಸಿ ➔",
    quick_access_title: "ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು",
    org_tagline_text: "(ನೋಂದಣಿ ಸಂಖ್ಯೆ 75/2000). (ನೆಹರೂ ಯುವಕೇಂದ್ರ ಸಂಯೋಜಿತ)",
    org_address_text: "ಮಿಲ್ಲತ್ ನಗರ, ಉದುಮ ಪಡಿಞಾರ್ (P.O), 671 319, ಕಾಸರಗೋಡು"
  }
};

function initLanguageController() {
  const savedLang = sessionStorage.getItem('nasc_lang') || 'en';
  applyLanguage(savedLang);

  document.querySelectorAll('.lang-select').forEach(select => {
    select.value = savedLang;
    select.addEventListener('change', (e) => {
      const lang = e.target.value;
      applyLanguage(lang);
      sessionStorage.setItem('nasc_lang', lang);
    });
  });
}

function applyLanguage(lang) {
  const dictionary = I18N[lang] || I18N.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dictionary[key]) {
      el.textContent = dictionary[key];
    }
  });

  document.querySelectorAll('.lang-select').forEach(sel => {
    sel.value = lang;
  });
}

/**
 * Initialize Header & Footer branding from CONFIG
 */
function initOrgBranding() {
  const brandLogos = document.querySelectorAll('.brand-logo-img');
  brandLogos.forEach(img => {
    img.src = CONFIG.ORG_LOGO;
    img.alt = CONFIG.ORG_NAME;
  });

  const brandNames = document.querySelectorAll('.org-name-text');
  brandNames.forEach(el => {
    el.textContent = CONFIG.ORG_NAME;
  });

  const brandTaglines = document.querySelectorAll('.org-tagline-text');
  brandTaglines.forEach(el => {
    el.textContent = CONFIG.ORG_TAGLINE;
  });

  const yearEls = document.querySelectorAll('.current-year');
  yearEls.forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navLinks = document.getElementById('navLinks');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }
}

/**
 * Check if Apps Script URL is set, show friendly notice if empty
 */
function checkConfigState() {
  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
    const banner = document.createElement('div');
    banner.className = 'demo-banner';
    banner.innerHTML = `
      <p>
        <strong>⚡ DEMO MODE ACTIVE:</strong> Backend Apps Script Web App URL is not set in <code>js/config.js</code>. 
        Form submissions and card generation will run locally using LocalStorage demo mode.
      </p>
    `;
    document.body.prepend(banner);
  }
}

/**
 * Show Global Toast Notification
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'danger') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Show Global Loading Spinner
 */
function showLoading(text = 'Processing request...') {
  let overlay = document.getElementById('globalLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="spinner"></div>
      <p style="font-weight: 600; color: #1e293b;" id="loadingText">${text}</p>
    `;
    document.body.appendChild(overlay);
  } else {
    document.getElementById('loadingText').textContent = text;
    overlay.style.display = 'flex';
  }
}

/**
 * Hide Global Loading Spinner
 */
function hideLoading() {
  const overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Date Formatting Utility
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Convert Google Drive viewer URL to direct image display URL
 */
function formatDriveImageUrl(url) {
  if (!url) return 'assets/logo.svg';
  if (url.startsWith('data:image/')) return url;
  if (url.includes('lh3.googleusercontent.com')) return url;

  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

/**
 * Client-Side LocalStorage Demo Store
 */
const DemoStore = {
  KEY: 'gvo_membership_demo_db',

  getMembers() {
    const data = localStorage.getItem(this.KEY);
    if (!data) {
      // Pre-seed with sample member for easy testing
      const initial = [
        {
          membershipId: `${CONFIG.ID_PREFIX}-${CONFIG.ID_YEAR}-0001`,
          fullName: "Alexander Wright",
          photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
          dob: "1994-05-15",
          gender: "Male",
          nationality: "Indian",
          residenceCountry: "United Arab Emirates (UAE)",
          phone: "+1 555-0147",
          whatsapp: "+1 555-0147",
          email: "alexander.w@example.com",
          address: "742 Evergreen Terrace",
          district: "Central",
          state: "New York",
          pinCode: "10001",
          bloodGroup: "O+",
          membershipType: "Premium",
          joiningDate: new Date().toISOString().split('T')[0],
          validFrom: formatDate(new Date()),
          validUntil: formatDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1))),
          registrationTimestamp: new Date().toISOString(),
          status: "Active",
          cardUrl: ""
        }
      ];
      localStorage.setItem(this.KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },

  saveMember(memberData) {
    const members = this.getMembers();
    // Generate next ID
    const nextSeq = members.length + 1;
    const seqStr = String(nextSeq).padStart(CONFIG.ID_DIGITS, '0');
    const newId = `${CONFIG.ID_PREFIX}-${CONFIG.ID_YEAR}-${seqStr}`;

    const validFromDate = new Date(memberData.joiningDate || new Date());
    const validUntilDate = new Date(validFromDate);
    validUntilDate.setFullYear(validUntilDate.getFullYear() + CONFIG.DEFAULT_VALIDITY_YEARS);

    const record = {
      ...memberData,
      membershipId: newId,
      validFrom: formatDate(validFromDate),
      validUntil: formatDate(validUntilDate),
      registrationTimestamp: new Date().toISOString(),
      status: "Active",
      cardUrl: ""
    };

    members.push(record);
    localStorage.setItem(this.KEY, JSON.stringify(members));
    return record;
  },

  findMember(idOrQuery) {
    const members = this.getMembers();
    const q = idOrQuery.trim().toLowerCase();
    return members.find(m => 
      m.membershipId.toLowerCase() === q || 
      m.phone.toLowerCase() === q ||
      m.email.toLowerCase() === q
    );
  },

  updateStatus(membershipId, newStatus) {
    const members = this.getMembers();
    const idx = members.findIndex(m => m.membershipId === membershipId);
    if (idx !== -1) {
      members[idx].status = newStatus;
      localStorage.setItem(this.KEY, JSON.stringify(members));
      return true;
    }
    return false;
  }
};
