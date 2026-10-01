/**
 * DIGITAL MEMBERSHIP CARD GENERATOR & DOWNLOAD LOGIC
 */

let currentCardSide = 'front';

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
  initCardActionButtons();
  window.addEventListener('resize', updateCardScale);
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
 * Helper: Escape HTML strings to prevent XSS script execution
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Dynamically updates CSS variable --card-scale for responsive Card Viewport
 */
function updateCardScale() {
  const wrappers = document.querySelectorAll('.card-scale-wrapper');
  wrappers.forEach(w => {
    const wWidth = w.clientWidth;
    if (wWidth > 0) {
      const scale = wWidth / 1536;
      w.style.setProperty('--card-scale', scale);
      w.style.height = `${wWidth * (969 / 1536)}px`;
    }
  });
}

/**
 * Render HTML structure of the Master ID Card System (Front & Back)
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

  // Escaped member fields for XSS security
  const safeName = escapeHtml(member.fullName);
  const safeId = escapeHtml(member.membershipId);
  const safeType = escapeHtml(member.membershipType || 'Adult Membership');
  const safeNationality = escapeHtml(member.nationality || 'Indian');
  const safeCountry = escapeHtml(formatCountryDisplay(member.residenceCountry || member.country));
  const safeStatus = escapeHtml(member.status || 'Active');

  const cardHtml = `
    <div class="printable-card-area">
      
      <!-- Card Side Control Toolbar (Outside Card) -->
      <div class="no-print" style="margin-bottom: 1.25rem; display: flex; gap: 0.75rem; justify-content: center;">
        <button id="toggleCardSideBtn" class="btn btn-outline-primary btn-sm" onclick="toggleCardSide()">
          <span>🔄</span> Switch to Back Side
        </button>
      </div>

      <!-- Master Card Viewport Container -->
      <div class="card-scale-wrapper">
        
        <!-- FRONT SIDE MASTER CANVAS (1536px x 969px) -->
        <div class="master-card-canvas" id="membershipCardElement">
          <div class="diagonal-beam"></div>
          <div class="security-watermark"></div>
          
          <!-- Header -->
          <div class="mc-header-row">
            <div class="mc-org-branding">
              <img src="${CONFIG.ORG_LOGO}" class="mc-org-logo" alt="Logo" onerror="this.src='assets/club-logo.png'">
              <div>
                <div class="mc-org-name">${CONFIG.ORG_NAME}</div>
                <div class="mc-org-sub">${CONFIG.ORG_TAGLINE}</div>
                <div class="mc-org-address">${CONFIG.ORG_ADDRESS}</div>
              </div>
            </div>
            <span class="mc-badge-type">${safeType}</span>
          </div>

          <!-- Body -->
          <div class="mc-body-row">
            <div class="mc-photo-box">
              <img src="${photoSrc}" alt="${safeName}" onerror="this.src='assets/club-logo.png'">
            </div>
            
            <div class="mc-details-box">
              <div class="mc-member-name">${safeName}</div>
              <div class="mc-member-id">${safeId}</div>
              
              <div class="mc-info-grid">
                <div class="mc-info-item">
                  <span class="mc-info-label">NATIONALITY</span>
                  <span class="mc-info-val">${safeNationality}</span>
                </div>
                <div class="mc-info-item">
                  <span class="mc-info-label">RESIDENCE</span>
                  <span class="mc-info-val">${safeCountry}</span>
                </div>
                <div class="mc-info-item">
                  <span class="mc-info-label">JOINED</span>
                  <span class="mc-info-val">${formatDate(member.joiningDate)}</span>
                </div>
                <div class="mc-info-item">
                  <span class="mc-info-label">VALID UNTIL</span>
                  <span class="mc-info-val">${formatDate(member.validUntil)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mc-footer-row">
            <span class="mc-status-pill">${safeStatus} MEMBER</span>
            <div class="mc-qr-box" id="cardQrCodeFront" title="Scan to Verify"></div>
          </div>
        </div>

        <!-- BACK SIDE MASTER CANVAS (1536px x 969px) -->
        <div class="master-card-canvas" id="membershipCardBackElement" style="display: none;">
          <div class="diagonal-beam"></div>
          <div class="security-watermark"></div>
          
          <!-- Back Header -->
          <div class="mc-back-header">
            <div>
              <div class="mc-back-title">${CONFIG.ORG_NAME}</div>
              <div class="mc-back-subtitle">OFFICIAL MEMBER CREDENTIAL & TERMS</div>
            </div>
            <span class="mc-badge-type" style="background: rgba(49, 211, 176, 0.2); color: #31d3b0; border-color: #31d3b0;">OFFICIAL ID</span>
          </div>

          <!-- Back Body -->
          <div class="mc-back-body">
            <div class="mc-terms-box">
              <h5>MEMBERSHIP TERMS & CONDITIONS</h5>
              <ol class="mc-terms-list">
                <li>This card is non-transferable and remains official property of NASC.</li>
                <li>Must be presented upon request to access club facilities, events, & voting.</li>
                <li>If found, please return to: Millath Nagar, Udma Padinhar (P.O), Kasaragod - 671 319.</li>
              </ol>
              <div class="mc-contact-info">
                <strong>President:</strong> ${CONFIG.PRESIDENT_NAME} (${CONFIG.PRESIDENT_PHONE})<br>
                <strong>Secretary:</strong> ${CONFIG.SECRETARY_NAME} (${CONFIG.SECRETARY_PHONE})<br>
                <strong>Email:</strong> ${CONFIG.ORG_EMAIL}
              </div>
            </div>

            <div class="mc-sign-box">
              <img src="assets/club-logo.png" class="mc-seal-img" alt="Official Seal">
              <div class="mc-sign-line">AUTHORIZED SIGNATURE</div>
              <div class="mc-qr-box" id="cardQrCodeBack" style="margin-top: 0.8rem;" title="Scan to Verify"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  container.innerHTML = cardHtml;
  currentCardSide = 'front';
  updateCardScale();

  // Render high-resolution QR Codes on Front and Back
  setTimeout(() => {
    ['cardQrCodeFront', 'cardQrCodeBack'].forEach(id => {
      const qrEl = document.getElementById(id);
      if (qrEl && window.QRCode) {
        qrEl.innerHTML = '';
        new QRCode(qrEl, {
          text: verifyUrl,
          width: 240,
          height: 240,
          colorDark: "#061d19",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    });
  }, 100);
}

/**
 * Toggle between Front and Back card views
 */
function toggleCardSide() {
  const frontEl = document.getElementById('membershipCardElement');
  const backEl = document.getElementById('membershipCardBackElement');
  const toggleBtn = document.getElementById('toggleCardSideBtn');

  if (!frontEl || !backEl) return;

  if (currentCardSide === 'front') {
    frontEl.style.display = 'none';
    backEl.style.display = 'block';
    currentCardSide = 'back';
    if (toggleBtn) toggleBtn.innerHTML = '<span>🔄</span> Switch to Front Side';
  } else {
    backEl.style.display = 'none';
    frontEl.style.display = 'block';
    currentCardSide = 'front';
    if (toggleBtn) toggleBtn.innerHTML = '<span>🔄</span> Switch to Back Side';
  }
  updateCardScale();
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
 * Bind Save Card (PNG image) and Download PDF buttons
 */
function initCardActionButtons() {
  const saveBtn = document.getElementById('saveCardBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveMembershipCard);
  }

  const pdfBtn = document.getElementById('downloadPdfBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', downloadPdfCard);
  }
}

/**
 * Master Canvas High-Resolution Capture Generator (1536x969 px)
 */
async function getExportCardCanvas(targetId = 'membershipCardElement') {
  const targetEl = document.getElementById(targetId);

  if (!targetEl) {
    throw new Error(`Membership card element #${targetId} not found`);
  }

  // 1. Ensure element is temporarily visible for capture if hidden
  const origDisplay = targetEl.style.display;
  if (origDisplay === 'none') {
    targetEl.style.display = 'block';
  }

  // 2. Wait for custom web fonts to load completely
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading check non-fatal error:', e);
    }
  }

  // 3. Ensure all images inside target element are loaded completely before capture
  const imgs = Array.from(targetEl.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      img.onload = done;
      img.onerror = done;
      setTimeout(done, 3000);
    });
  }));

  await new Promise(r => setTimeout(r, 150));

  // 4. Temporarily remove transform scaling and outer shadow for 1536x969 capture
  const origTransform = targetEl.style.transform;
  const origShadow = targetEl.style.boxShadow;
  targetEl.style.transform = 'none';
  targetEl.style.boxShadow = 'none';

  let canvas;
  try {
    canvas = await html2canvas(targetEl, {
      scale: 1, // exact 1536x969 px master resolution output
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      imageTimeout: 15000,
      logging: false
    });
  } finally {
    // Restore original styling and display
    targetEl.style.transform = origTransform;
    targetEl.style.boxShadow = origShadow;
    targetEl.style.display = origDisplay;
  }

  return canvas;
}

/**
 * Save Membership Card as high-resolution PNG Image with Web Share API and Mobile Fallback
 */
async function saveMembershipCard() {
  const memberIdText = (document.getElementById('displayMemberId')?.textContent || 'CARD').trim();
  const sideLabel = currentCardSide === 'back' ? 'Back' : 'Front';
  const fileName = `NASC-${memberIdText}-${sideLabel}.png`;

  showLoading(`Generating high-resolution ${sideLabel.toLowerCase()} card image...`);

  try {
    const targetId = currentCardSide === 'back' ? 'membershipCardBackElement' : 'membershipCardElement';
    const canvas = await getExportCardCanvas(targetId);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) {
      throw new Error('Failed to generate image Blob.');
    }

    hideLoading();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    const file = new File([blob], fileName, { type: 'image/png' });

    // 1. Web Share API with File sharing support (Mobile devices / iOS Safari / Android Chrome)
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: `NASC Membership Card (${sideLabel})`,
          text: `NASC Digital Membership Card for ${memberIdText}`
        });
        showToast("Choose Save Image or Save to Photos from the share menu.", "info");
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          // User cancelled/closed share sheet - do not show error
          return;
        }
        console.warn('Web Share failed, falling back to direct method:', shareErr);
      }
    }

    // 2. iOS Fallback for browsers without share support: Open image in new tab for long-press save
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        window.location.href = blobUrl;
      }
      showToast("Your membership card is ready. Long-press the image to save it.", "info");
      return;
    }

    // 3. Desktop / Standard Download
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

    showToast("Membership card download started.", "success");

  } catch (err) {
    console.error('Save card error:', err);
    hideLoading();
    showToast("Unable to generate the membership card. Please try again.", "danger");
  }
}

/**
 * Download Membership Card as 2-Page CR80 PDF Document (Front & Back)
 */
async function downloadPdfCard() {
  const memberIdText = (document.getElementById('displayMemberId')?.textContent || 'CARD').trim();
  const fileName = `NASC-${memberIdText}-Membership-Card.pdf`;

  showLoading('Generating 2-page print-ready PDF card (Front & Back)...');

  try {
    const frontCanvas = await getExportCardCanvas('membershipCardElement');
    const backCanvas = await getExportCardCanvas('membershipCardBackElement');

    const frontImgData = frontCanvas.toDataURL('image/png', 1.0);
    const backImgData = backCanvas.toDataURL('image/png', 1.0);
    const { jsPDF } = window.jspdf || {};

    if (!jsPDF) {
      hideLoading();
      window.print();
      return;
    }

    // Standard CR80 Card landscape dimensions (85.60mm x 53.98mm)
    const pdfWidth = 85.60;
    const pdfHeight = 53.98;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Page 1: Front Side Card
    pdf.addImage(frontImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 2: Back Side Card
    pdf.addPage([pdfWidth, pdfHeight], 'landscape');
    pdf.addImage(backImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    pdf.save(fileName);

    hideLoading();
    showToast("Membership card PDF download started.", "success");

  } catch (err) {
    console.error('PDF download error:', err);
    hideLoading();
    showToast("Unable to generate the membership card PDF. Please try again.", "danger");
  }
}
