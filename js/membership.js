/**
 * DIGITAL MEMBERSHIP CARD GENERATOR & DOWNLOAD LOGIC
 */

document.addEventListener('DOMContentLoaded', () => {
  const cardContainer = document.getElementById('digitalCardContainer');
  if (!cardContainer) return;

  // Check URL param or sessionStorage for member data
  const urlParams = new URLSearchParams(window.location.search);
  const memberIdParam = urlParams.get('id');

  // Check sessionStorage first so uploaded photo is displayed immediately after registration
  const stored = sessionStorage.getItem('currentMember');
  let sessionMember = null;
  if (stored) {
    try { sessionMember = JSON.parse(stored); } catch(e) {}
  }

  if (sessionMember && (!memberIdParam || sessionMember.membershipId === memberIdParam)) {
    renderDigitalCard(sessionMember);
  } else if (memberIdParam) {
    loadAndRenderMember(memberIdParam);
  } else {
    showMemberNotFound();
  }

  initLookupForm();
  initDownloadButton();
});

/**
 * Fetch member record from GAS backend or DemoStore and render
 */
async function loadAndRenderMember(memberId) {
  showLoading('Retrieving digital membership card...');
  try {
    let memberData = null;

    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(`${CONFIG.WEB_APP_URL}?action=getMember&id=${encodeURIComponent(memberId)}`);
      const result = await resp.json();
      if (result.status === 'success') {
        memberData = result.data;
      }
    } else {
      memberData = DemoStore.findMember(memberId);
    }

    if (memberData) {
      renderDigitalCard(memberData);
    } else {
      showMemberNotFound(memberId);
    }
  } catch (err) {
    console.error('Error fetching member:', err);
    showToast('Failed to load member card', 'danger');
  } finally {
    hideLoading();
  }
}

function formatCountryDisplay(country) {
  if (!country) return '🇮🇳 India';
  const c = country.trim();
  if (c.includes('India')) return '🇮🇳 India';
  if (c.includes('Emirates') || c.includes('UAE')) return '🇦🇪 UAE';
  if (c.includes('Qatar')) return '🇶🇦 Qatar';
  if (c.includes('Saudi')) return '🇸🇦 Saudi Arabia';
  if (c.includes('Oman')) return '🇴🇲 Oman';
  if (c.includes('Kuwait')) return '🇰🇼 Kuwait';
  if (c.includes('Bahrain')) return '🇧🇭 Bahrain';
  if (c.includes('United Kingdom') || c.includes('UK')) return '🇬🇧 UK';
  if (c.includes('United States') || c.includes('USA')) return '🇺🇸 USA';
  if (c.includes('Canada')) return '🇨🇦 Canada';
  if (c.includes('Australia')) return '🇦🇺 Australia';
  return c;
}

/**
 * Render HTML structure of the Digital Card
 */
function renderDigitalCard(member) {
  const container = document.getElementById('digitalCardContainer');
  if (!container) return;

  const displayId = document.getElementById('displayMemberId');
  if (displayId) displayId.textContent = member.membershipId;

  // Build Verification URL for QR code
  const currentBaseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
  const verifyUrl = `${currentBaseUrl}/verify.html?id=${encodeURIComponent(member.membershipId)}`;

  const rawPhoto = member.photoUrl || member.photoBase64 || '';
  const photoSrc = formatDriveImageUrl(rawPhoto);

  const cardHtml = `
    <div class="printable-card-area">
      <div class="digital-card" id="membershipCardElement">
        <div class="card-gold-stripe"></div>
        
        <!-- Header -->
        <div class="card-header-row">
          <div class="card-org-branding">
            <img src="${CONFIG.ORG_LOGO}" class="card-org-logo" alt="Logo" onerror="this.src='assets/logo.svg'">
            <div>
              <div class="card-org-name">${CONFIG.ORG_NAME}</div>
              <div class="card-org-sub">${CONFIG.ORG_TAGLINE}</div>
              <div class="card-org-address" style="font-size: 0.6rem; color: #94a3b8; margin-top: 2px;">${CONFIG.ORG_ADDRESS}</div>
            </div>
          </div>
          <span class="card-badge-type">${member.membershipType || 'Standard'}</span>
        </div>

        <!-- Body -->
        <div class="card-body-row">
          <div class="card-photo-box">
            <img src="${photoSrc}" alt="${member.fullName}" onerror="this.src='assets/logo.svg'">
          </div>
          
          <div class="card-details-box">
            <div class="card-member-name">${member.fullName}</div>
            <div class="card-member-id">${member.membershipId}</div>
            
            <div class="card-info-grid">
              <div class="card-info-item">
                <span class="card-info-label">NATIONALITY</span>
                <span class="card-info-val">${member.nationality || 'Indian'}</span>
              </div>
              <div class="card-info-item">
                <span class="card-info-label">COUNTRY</span>
                <span class="card-info-val">${formatCountryDisplay(member.residenceCountry || member.country)}</span>
              </div>
              <div class="card-info-item">
                <span class="card-info-label">JOINED</span>
                <span class="card-info-val">${formatDate(member.joiningDate)}</span>
              </div>
              <div class="card-info-item">
                <span class="card-info-label">VALID UNTIL</span>
                <span class="card-info-val">${formatDate(member.validUntil)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer-row">
          <div class="card-security-chip">
            <div class="card-chip-icon"></div>
            <span class="card-status-pill">${member.status || 'Active'}</span>
          </div>

          <div class="card-qr-box" id="cardQrCode" title="Scan to Verify"></div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = cardHtml;

  // Generate QR Code inside card
  setTimeout(() => {
    const qrContainer = document.getElementById('cardQrCode');
    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
        text: verifyUrl,
        width: 44,
        height: 44,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
}

/**
 * Show error if member record not found
 */
function showMemberNotFound(query = '') {
  const container = document.getElementById('digitalCardContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="card-box text-center" style="max-width: 480px; margin: 2rem auto;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
      <h3>Membership Card Not Found</h3>
      <p style="color: var(--slate-600); margin: 1rem 0;">
        We could not find an active membership matching <strong>"${query || 'the requested ID'}"</strong>.
      </p>
      <a href="index.html" class="btn btn-secondary">Back to Home</a>
    </div>
  `;
}

/**
 * Handle "Already a Member" Search / Lookup Form
 */
function initLookupForm() {
  const lookupForm = document.getElementById('alreadyMemberForm');
  if (!lookupForm) return;

  lookupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('lookupQuery').value.trim();
    if (!query) {
      showToast('Please enter your Membership ID or Phone Number', 'warning');
      return;
    }
    loadAndRenderMember(query);
  });
}

/**
 * Download Card as PNG Image or trigger Print
 */
function initDownloadButton() {
  const downloadBtn = document.getElementById('downloadCardBtn');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', async () => {
    const cardEl = document.getElementById('membershipCardElement');
    if (!cardEl) {
      showToast('Membership card element not found', 'danger');
      return;
    }

    if (!window.html2canvas) {
      // Fallback: Trigger native browser print
      window.print();
      return;
    }

    showLoading('Generating high-resolution card image...');
    try {
      const canvas = await html2canvas(cardEl, {
        scale: 3, // High DPI resolution for crisp print/image
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;

      const memberIdText = document.getElementById('displayMemberId')?.textContent || 'Membership_Card';
      link.download = `${memberIdText}_DigitalCard.png`;
      link.click();

      showToast('Membership card downloaded successfully!', 'success');
    } catch (err) {
      console.error('Download error:', err);
      // Fallback to window.print if canvas fails
      window.print();
    } finally {
      hideLoading();
    }
  });
}
