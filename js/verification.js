/**
 * PUBLIC MEMBERSHIP VERIFICATION LOGIC
 * Security: Hides all sensitive PII (Phone, Address, Email, DOB)
 */

document.addEventListener('DOMContentLoaded', () => {
  const verifyForm = document.getElementById('verifyForm');

  // Check URL query param (e.g., verify.html?id=NASC-2026-0001)
  const urlParams = new URLSearchParams(window.location.search);
  const searchId = (urlParams.get('id') || '').trim().toUpperCase();

  if (searchId) {
    const input = document.getElementById('verifyIdInput');
    if (input) input.value = searchId;
    performVerification(searchId);
  }

  if (verifyForm) {
    verifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawInput = document.getElementById('verifyIdInput');
      const id = rawInput ? rawInput.value.trim().toUpperCase() : '';
      if (rawInput) rawInput.value = id;
      if (!id) {
        showToast('Please enter a Membership ID to verify', 'warning');
        return;
      }
      performVerification(id);
    });
  }
});

/**
 * Security Helper: Escape HTML strings to prevent XSS
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
 * Execute public membership verification lookup
 */
async function performVerification(membershipId) {
  const container = document.getElementById('verifyResult');
  if (!container) return;

  const normalizedId = (membershipId || '').trim().toUpperCase();
  if (!normalizedId) return;

  showLoading('Verifying membership records...');
  try {
    let result = null;

    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(`${CONFIG.WEB_APP_URL}?action=verifyMember&id=${encodeURIComponent(normalizedId)}`);
      const apiRes = await resp.json();
      if (apiRes && apiRes.status === 'success' && apiRes.data) {
        result = apiRes.data;
      }
    } else {
      // Local Demo lookup
      const raw = DemoStore.findMember(normalizedId);
      if (raw) {
        // Strip out PII for public output
        result = {
          membershipId: raw.membershipId,
          fullName: raw.fullName,
          membershipType: raw.membershipType,
          status: raw.status || 'Active',
          validFrom: raw.validFrom,
          validUntil: raw.validUntil,
          photoUrl: raw.photoUrl,
          nationality: raw.nationality,
          residenceCountry: raw.residenceCountry
        };
      }
    }

    if (result) {
      renderVerificationSuccess(result);
    } else {
      renderVerificationFailed(normalizedId);
    }

  } catch (err) {
    console.error('Verification error:', err);
    showToast('Unable to connect to the verification service. Please try again.', 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Render Verified Member UI (PII Excluded)
 */
function renderVerificationSuccess(data) {
  const container = document.getElementById('verifyResult');
  
  const isStatusActive = (data.status || '').toLowerCase() === 'active';
  const badgeClass = isStatusActive ? 'verify-badge-verified' : 'verify-badge-invalid';
  const badgeText = isStatusActive ? 'VERIFIED ACTIVE MEMBER' : `MEMBERSHIP STATUS: ${escapeHtml(data.status || 'INACTIVE').toUpperCase()}`;
  const badgeIcon = isStatusActive ? '✅' : '⚠️';

  container.innerHTML = `
    <div class="verify-card" style="margin-top: 1.5rem;">
      <div style="text-align: center;">
        <div class="${badgeClass}">
          <span>${badgeIcon}</span> ${badgeText}
        </div>
      </div>

      <div style="display: flex; gap: 1.5rem; align-items: center; justify-content: center; flex-wrap: wrap; margin: 1.5rem 0; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem;">
        <img src="${formatDriveImageUrl(data.photoUrl || data.photoBase64 || data.photo)}" alt="${escapeHtml(data.fullName)}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-500); box-shadow: var(--shadow-md);" onerror="this.src='assets/user-placeholder.svg'">
        <div>
          <h3 style="font-size: 1.4rem; color: var(--slate-900);">${escapeHtml(data.fullName)}</h3>
          <div style="font-family: monospace; font-size: 1.1rem; color: var(--primary-600); font-weight: 700;">${escapeHtml(data.membershipId)}</div>
        </div>
      </div>

      <!-- Public Info Only (NO Phone, Address, Email, or DOB) -->
      <div class="verify-details-grid">
        <div class="verify-detail-item">
          <div class="verify-detail-label">NATIONALITY</div>
          <div class="verify-detail-val">${escapeHtml(data.nationality || 'Indian')}</div>
        </div>
        <div class="verify-detail-item">
          <div class="verify-detail-label">COUNTRY OF RESIDENCE</div>
          <div class="verify-detail-val">${escapeHtml(data.residenceCountry || 'India')}</div>
        </div>
        <div class="verify-detail-item">
          <div class="verify-detail-label">MEMBERSHIP TYPE</div>
          <div class="verify-detail-val">${escapeHtml(data.membershipType || 'Adult Membership')}</div>
        </div>
        <div class="verify-detail-item">
          <div class="verify-detail-label">MEMBERSHIP STATUS</div>
          <div class="verify-detail-val" style="color: ${isStatusActive ? 'var(--success-600)' : 'var(--danger-600)'}">${escapeHtml(data.status || 'Active')}</div>
        </div>
        <div class="verify-detail-item">
          <div class="verify-detail-label">VALID FROM</div>
          <div class="verify-detail-val">${formatDate(data.validFrom)}</div>
        </div>
        <div class="verify-detail-item">
          <div class="verify-detail-label">VALID UNTIL</div>
          <div class="verify-detail-val">${formatDate(data.validUntil)}</div>
        </div>
      </div>

      <div style="margin-top: 2rem; text-align: center; font-size: 0.82rem; color: var(--slate-500); background-color: var(--slate-50); padding: 0.75rem; border-radius: var(--radius-md);">
        🔒 <strong>Privacy Note:</strong> This public verification page only displays non-sensitive membership credential information as per organization privacy policy.
      </div>
    </div>
  `;
}

/**
 * Render Invalid / Not Found Verification UI
 */
function renderVerificationFailed(membershipId) {
  const container = document.getElementById('verifyResult');
  container.innerHTML = `
    <div class="verify-card" style="margin-top: 1.5rem; text-align: center;">
      <div class="verify-badge-invalid">
        <span>❌</span> INVALID OR UNVERIFIED MEMBERSHIP ID
      </div>
      
      <p style="color: var(--slate-600); margin: 1rem 0;">
        No active registration record was found for Membership ID: <strong>"${escapeHtml(membershipId)}"</strong>.
      </p>

      <p style="font-size: 0.9rem; color: var(--slate-500);">
        If you recently registered, please ensure you entered the exact ID format (e.g., <code>NASC-2026-0001</code>).
      </p>
    </div>
  `;
}

