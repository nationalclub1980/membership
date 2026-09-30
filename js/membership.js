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
 * Render HTML structure of the Digital Card (Responsive & Dedicated Export Copy)
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

  // 1. On-Screen Responsive Card HTML
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

  // 2. Dedicated Fixed 856x540 Off-Screen Export Card HTML (Protects exports from mobile responsive cropping)
  let exportContainer = document.getElementById('exportCardContainer');
  if (!exportContainer) {
    exportContainer = document.createElement('div');
    exportContainer.id = 'exportCardContainer';
    exportContainer.className = 'export-card-wrapper';
    exportContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(exportContainer);
  }

  const exportCardHtml = `
    <div class="export-digital-card" id="exportMembershipCardElement">
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

        <div class="card-qr-box" id="exportCardQrCode" title="Scan to Verify"></div>
      </div>
    </div>
  `;

  exportContainer.innerHTML = exportCardHtml;

  // Generate QR Codes inside both on-screen and export cards
  setTimeout(() => {
    const qrConfigs = [
      { id: 'cardQrCode', size: 44 },
      { id: 'exportCardQrCode', size: 68 }
    ];

    qrConfigs.forEach(item => {
      const qrEl = document.getElementById(item.id);
      if (qrEl && window.QRCode) {
        qrEl.innerHTML = '';
        new QRCode(qrEl, {
          text: verifyUrl,
          width: item.size,
          height: item.size,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    });
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
 * Primary Action: Save Membership Card as high-resolution PNG Image
 * Native Mobile: Uses Web Share API (navigator.share) with File object when supported.
 * Mobile Fallback: Opens image in a new tab with press-and-hold save instructions.
 * Desktop Fallback: Triggers standard browser file download.
 */
/**
 * Dedicated Fixed-Size Canvas Generator for Export (856x540 px)
 * Captures the off-screen export card to prevent mobile viewport clipping.
 */
async function getExportCardCanvas() {
  let exportCard = document.getElementById('exportMembershipCardElement');
  const targetEl = exportCard || document.getElementById('membershipCardElement');

  if (!targetEl) {
    throw new Error('Membership card target element not found');
  }

  // Ensure all images (photo, logo) inside target element are loaded before capture
  const imgs = targetEl.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // Short delay to ensure QR canvas element is fully flushed
  await new Promise(r => setTimeout(r, 120));

  const isExport = targetEl.id === 'exportMembershipCardElement';

  return await html2canvas(targetEl, {
    width: isExport ? 856 : targetEl.offsetWidth,
    height: isExport ? 540 : targetEl.offsetHeight,
    windowWidth: isExport ? 856 : undefined,
    windowHeight: isExport ? 540 : undefined,
    scale: 2, // 2x scale for crisp 1712x1080 canvas export
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false
  });
}

/**
 * Primary Action: Save Membership Card as high-resolution PNG Image
 * Native Mobile: Uses Web Share API (navigator.share) with File object when supported.
 * Mobile Fallback: Opens image in a new tab with press-and-hold save instructions.
 * Desktop Fallback: Triggers standard browser file download.
 */
async function saveMembershipCard() {
  const memberIdText = (document.getElementById('displayMemberId')?.textContent || 'CARD').trim();
  const fileName = `NASC-Membership-Card-${memberIdText}.png`;

  showLoading('Generating high-resolution membership card image...');

  try {
    const canvas = await getExportCardCanvas();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) {
      throw new Error('Failed to create image Blob.');
    }

    const file = new File([blob], fileName, { type: 'image/png' });

    hideLoading();

    // 1. Detect native Web Share API file sharing support
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "National Arts & Sports Club Membership Card"
        });
        // Share sheet succeeded or handed to native OS dialog
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          // User cancelled the share dialog - do not show error
          return;
        }
        console.warn('Native file share failed, using fallback:', shareErr);
      }
    }

    // Detect if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (isMobile) {
      // 2. Mobile Fallback: Create Object URL, open image in new tab
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');

      const instructionEl = document.getElementById('mobileSaveInstruction');
      if (instructionEl) {
        instructionEl.style.display = 'block';
        instructionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      showToast('Membership card opened. Press and hold the image to save it.', 'info');
    } else {
      // 3. Desktop Fallback: Programmatic download via <a download> link
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      showToast('Membership card is ready. Choose Save Image to save it to your phone.', 'info');
    }

  } catch (err) {
    console.error('Save card error:', err);
    hideLoading();
    showToast('Could not generate membership card image. Please try Print / View Card.', 'danger');
  }
}

/**
 * Secondary Action: Download Membership Card as PDF document
 * Uses html2canvas + jsPDF to generate printable PDF document.
 */
async function downloadPdfCard() {
  const memberIdText = (document.getElementById('displayMemberId')?.textContent || 'CARD').trim();
  const fileName = `NASC-Membership-Card-${memberIdText}.pdf`;

  showLoading('Generating printable PDF card...');

  try {
    const canvas = await getExportCardCanvas();

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf || {};

    if (!jsPDF) {
      hideLoading();
      window.print();
      return;
    }

    // Standard ID Card landscape dimensions (85.6mm x 54mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
    pdf.save(fileName);

    hideLoading();
    showToast('PDF membership card downloaded.', 'success');

  } catch (err) {
    console.error('PDF download error:', err);
    hideLoading();
    showToast('Could not generate PDF. Please try Print / View Card instead.', 'danger');
  }
}
