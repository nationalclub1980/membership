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
  initCardActionButtons();
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
/**
 * Render HTML structure of the Digital Card (Single Source of Truth)
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

  // Single Source of Truth Card HTML
  const cardHtml = `
    <div class="printable-card-area">
      <div class="digital-card" id="membershipCardElement">
        <div class="diagonal"></div>
        
        <!-- Header -->
        <div class="card-header-row">
          <div class="card-org-branding">
            <img src="${CONFIG.ORG_LOGO}" class="card-org-logo" alt="Logo" onerror="this.src='assets/club-logo.png'">
            <div>
              <div class="card-org-name">${CONFIG.ORG_NAME}</div>
              <div class="card-org-sub">${CONFIG.ORG_TAGLINE}</div>
              <div class="card-org-address">${CONFIG.ORG_ADDRESS}</div>
            </div>
          </div>
          <span class="card-badge-type">${safeType}</span>
        </div>

        <!-- Body -->
        <div class="card-body-row">
          <div class="card-photo-box">
            <img src="${photoSrc}" alt="${safeName}" onerror="this.src='assets/club-logo.png'">
          </div>
          
          <div class="card-details-box">
            <div class="card-member-name">${safeName}</div>
            <div class="card-member-id">${safeId}</div>
            
            <div class="card-info-grid">
              <div class="card-info-item">
                <span class="card-info-label">NATIONALITY</span>
                <span class="card-info-val">${safeNationality}</span>
              </div>
              <div class="card-info-item">
                <span class="card-info-label">RESIDENCE</span>
                <span class="card-info-val">${safeCountry}</span>
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
          <span class="card-status-pill">${safeStatus} MEMBER</span>

          <div class="card-qr-box" id="cardQrCode" title="Scan to Verify"></div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = cardHtml;

  // Cleanup old export container if present
  const oldExport = document.getElementById('exportCardContainer');
  if (oldExport) oldExport.remove();

  // Generate high-density QR Code inside preview card
  setTimeout(() => {
    const qrEl = document.getElementById('cardQrCode');
    if (qrEl && window.QRCode) {
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text: verifyUrl,
        width: 120, // Render high resolution QR code inside 42px box
        height: 120,
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
 * Single Source of Truth High-Resolution Canvas Generator
 * Captures the exact preview card (#membershipCardElement) DOM element without layout mutation or outer shadow padding.
 */
async function getExportCardCanvas() {
  const targetEl = document.getElementById('membershipCardElement');

  if (!targetEl) {
    throw new Error('Membership card element #membershipCardElement not found');
  }

  // 1. Wait for custom web fonts to load completely
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // 2. Ensure all images (photo, logo) inside target element are loaded before capture
  const imgs = targetEl.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // Short delay to ensure QR canvas element is fully flushed
  await new Promise(r => setTimeout(r, 100));

  // 3. Measure exact rendered bounding client rectangle of the card
  const rect = targetEl.getBoundingClientRect();

  // 4. Temporarily disable outer drop-shadow to prevent html2canvas from expanding canvas bounds
  const origShadow = targetEl.style.boxShadow;
  targetEl.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)';

  let canvas;
  try {
    // Capture the EXACT preview card DOM element tightly
    canvas = await html2canvas(targetEl, {
      scale: 3, // 3x high-resolution export for ultra-sharp output
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false
    });
  } finally {
    // Restore original card styling
    targetEl.style.boxShadow = origShadow;
  }

  // Developer aspect ratio validation check
  const previewRatio = rect.width / rect.height;
  const exportRatio = canvas.width / canvas.height;
  const diff = Math.abs(previewRatio - exportRatio);

  console.log('Single Source of Truth Aspect Ratio Check:', {
    previewWidth: rect.width,
    previewHeight: rect.height,
    previewRatio: previewRatio.toFixed(4),
    exportWidth: canvas.width,
    exportHeight: canvas.height,
    exportRatio: exportRatio.toFixed(4),
    difference: diff.toFixed(4)
  });

  if (diff > 0.02) {
    console.warn(`Aspect ratio mismatch warning: Preview ${previewRatio.toFixed(3)} vs Export ${exportRatio.toFixed(3)} (Diff: ${diff.toFixed(3)})`);
  }

  return canvas;
}

/**
 * Primary Action: Save Membership Card as high-resolution PNG Image
 * Directly triggers browser download to the Downloads folder.
 * Does NOT open Windows Photos, Photo Edit, or new tabs.
 */
async function saveMembershipCard() {
  const memberIdText = (document.getElementById('displayMemberId')?.textContent || 'CARD').trim();
  const fileName = `${memberIdText}-Membership-Card.png`;

  showLoading('Generating high-resolution membership card image...');

  try {
    const canvas = await getExportCardCanvas();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) {
      throw new Error('Failed to create image Blob.');
    }

    hideLoading();

    // Direct Programmatic Browser Download via temporary <a> link
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);

    showToast('Membership card PNG downloaded successfully!', 'success');

  } catch (err) {
    console.error('Save card error:', err);
    hideLoading();
    showToast('Could not generate membership card image. Please try Print / View Card.', 'danger');
  }
}

/**
 * Secondary Action: Download Membership Card as PDF document
 * Uses html2canvas + jsPDF to generate custom borderless card PDF document.
 */
async function downloadPdfCard() {
  const memberIdText = (document.getElementById('displayMemberId')?.textContent || 'CARD').trim();
  const fileName = `${memberIdText}-Membership-Card.pdf`;

  showLoading('Generating printable PDF card...');

  try {
    const canvas = await getExportCardCanvas();

    const imgData = canvas.toDataURL('image/png', 1.0);
    const { jsPDF } = window.jspdf || {};

    if (!jsPDF) {
      hideLoading();
      window.print();
      return;
    }

    // Standard card base width in mm
    const pdfWidth = 85.6;
    // Calculate exact PDF height in mm matching the canvas aspect ratio precisely (no distortion, no white margins)
    const pdfHeight = Number((pdfWidth / (canvas.width / canvas.height)).toFixed(2));

    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(fileName);

    hideLoading();
    showToast('PDF membership card downloaded successfully!', 'success');

  } catch (err) {
    console.error('PDF download error:', err);
    hideLoading();
    showToast('Could not generate PDF. Please try Print / View Card instead.', 'danger');
  }
}

