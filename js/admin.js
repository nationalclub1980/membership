/**
 * PROTECTED ADMIN DASHBOARD MANAGEMENT
 */

let currentAdminPin = '';
let allAdminMembers = [];

document.addEventListener('DOMContentLoaded', () => {
  const adminContainer = document.getElementById('adminApp');
  if (!adminContainer) return;

  initAdminAuth();
});

/**
 * Handle Admin Authentication PIN Prompt
 */
function initAdminAuth() {
  const loginForm = document.getElementById('adminLoginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pinInput = document.getElementById('adminPinInput').value.trim();

    if (!pinInput) {
      showToast('Please enter the Admin PIN', 'warning');
      return;
    }

    showLoading('Authenticating admin session...');
    try {
      let isAuthenticated = false;

      if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
        const resp = await fetch(`${CONFIG.WEB_APP_URL}?action=adminLogin&pin=${encodeURIComponent(pinInput)}`);
        const result = await resp.json();
        isAuthenticated = (result.status === 'success');
      } else {
        // Demo mode validation against CONFIG.ADMIN_DEFAULT_PIN
        isAuthenticated = (pinInput === CONFIG.ADMIN_DEFAULT_PIN);
      }

      if (isAuthenticated) {
        currentAdminPin = pinInput;
        document.getElementById('adminAuthSection').style.display = 'none';
        document.getElementById('adminDashboardSection').style.display = 'block';
        showToast('Admin login successful!', 'success');
        fetchAdminData();
        initAdminControls();
      } else {
        showToast('Invalid Admin PIN passcode', 'danger');
      }
    } catch (err) {
      console.error('Admin Auth Error:', err);
      showToast('Authentication check failed', 'danger');
    } finally {
      hideLoading();
    }
  });
}

/**
 * Fetch member list for admin table
 */
async function fetchAdminData() {
  showLoading('Loading membership database...');
  try {
    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(`${CONFIG.WEB_APP_URL}?action=getAdminData&pin=${encodeURIComponent(currentAdminPin)}`);
      const result = await resp.json();
      if (result.status === 'success') {
        allAdminMembers = result.data || [];
      } else {
        showToast(result.message || 'Failed to fetch admin records', 'danger');
        allAdminMembers = [];
      }
    } else {
      allAdminMembers = DemoStore.getMembers();
    }

    renderAdminDashboard(allAdminMembers);
  } catch (err) {
    console.error('Fetch Admin Data Error:', err);
    showToast('Failed to load members table', 'danger');
  } finally {
    hideLoading();
  }
}

let currentlyDisplayedMembers = [];

/**
 * Render Admin Dashboard Table & Metrics
 */
function renderAdminDashboard(members) {
  currentlyDisplayedMembers = members;
  // Update Metrics Cards
  const totalCount = members.length;
  const activeCount = members.filter(m => (m.status || 'Active').toLowerCase() === 'active').length;
  const expiredCount = members.filter(m => (m.status || '').toLowerCase() === 'expired').length;

  document.getElementById('statTotalMembers').textContent = totalCount;
  document.getElementById('statActiveMembers').textContent = activeCount;
  document.getElementById('statExpiredMembers').textContent = expiredCount;

  // Render Table Rows
  const tbody = document.getElementById('adminMembersTbody');
  if (!tbody) return;

  if (members.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--slate-500);">
          No member records found matching your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = members.map(m => {
    const isAct = (m.status || 'Active').toLowerCase() === 'active';
    const badgeClass = isAct ? 'badge-active' : 'badge-expired';
    const regType = m.registrationType || 'New Member';
    const regTypeBadgeClass = regType === 'Renewal' ? 'badge-renewal' : 'badge-new';

    return `
      <tr>
        <td><strong>${m.membershipId}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <img src="${m.photoUrl || CONFIG.ORG_LOGO}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
            <span>${m.fullName}</span>
          </div>
        </td>
        <td>${m.phone || 'N/A'}</td>
        <td><span class="badge ${regTypeBadgeClass}">${regType}</span></td>
        <td>${m.membershipType || 'Standard'}</td>
        <td>${formatDate(m.joiningDate)}</td>
        <td><span class="badge ${badgeClass}">${m.status || 'Active'}</span></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewMemberCardModal('${m.membershipId}')">View Card</button>
            <button class="btn btn-outline-primary btn-sm" onclick="toggleStatusModal('${m.membershipId}', '${m.status}')">Edit Status</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Initialize Filters, Search, and Excel Export
 */
function initAdminControls() {
  const searchInput = document.getElementById('adminSearchInput');
  const statusFilter = document.getElementById('adminStatusFilter');
  const exportBtn = document.getElementById('exportExcelBtn');

  const filterHandler = () => {
    const q = searchInput.value.toLowerCase().trim();
    const st = statusFilter.value.toLowerCase();

    const filtered = allAdminMembers.filter(m => {
      const matchSearch = 
        m.membershipId.toLowerCase().includes(q) ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q));

      const matchStatus = st === 'all' || (m.status || 'active').toLowerCase() === st;

      return matchSearch && matchStatus;
    });

    renderAdminDashboard(filtered);
  };

  if (searchInput) searchInput.addEventListener('input', filterHandler);
  if (statusFilter) statusFilter.addEventListener('change', filterHandler);

  // Excel (.xlsx) Download Handler
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
  }
}

/**
 * Export Membership Database to Excel (.xlsx) file
 */
function exportToExcel() {
  const targetMembers = (currentlyDisplayedMembers && currentlyDisplayedMembers.length > 0) ? currentlyDisplayedMembers : allAdminMembers;

  if (!targetMembers || targetMembers.length === 0) {
    showToast('No member data available to export', 'warning');
    return;
  }

  showLoading('Preparing Excel file export...');
  try {
    // Format data cleanly for spreadsheet headers
    const exportRows = targetMembers.map(m => ({
      "Membership ID": m.membershipId,
      "Registration Type": m.registrationType || 'New Member',
      "Full Name": m.fullName,
      "Date of Birth": m.dob || '',
      "Gender": m.gender || '',
      "Nationality": m.nationality || 'Indian',
      "Country of Residence": m.residenceCountry || 'India',
      "Phone": m.phone || '',
      "WhatsApp": m.whatsapp || '',
      "Email": m.email || '',
      "Address": m.address || '',
      "District": m.district || '',
      "State": m.state || '',
      "PIN Code": m.pinCode || '',
      "Blood Group": m.bloodGroup || '',
      "Membership Type": m.membershipType || '',
      "Joining Date": m.joiningDate || '',
      "Valid From": m.validFrom || '',
      "Valid Until": m.validUntil || '',
      "Status": m.status || 'Active',
      "Registration Timestamp": m.registrationTimestamp || '',
      "Photo URL": m.photoUrl || ''
    }));

    if (window.XLSX) {
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Members");
      
      const fileName = `${CONFIG.ORG_SHORT_NAME}_Membership_Database_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast('Excel database file exported successfully!', 'success');
    } else {
      // Fallback CSV export
      exportToCsv(exportRows);
    }
  } catch (err) {
    console.error('Export Error:', err);
    showToast('Failed to export Excel file', 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Fallback CSV export if SheetJS XLSX is unavailable
 */
function exportToCsv(rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]).join(',');
  const csvLines = rows.map(r => 
    Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvLines].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${CONFIG.ORG_SHORT_NAME}_Membership_Export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open Modal to view member card
 */
function viewMemberCardModal(membershipId) {
  const member = allAdminMembers.find(m => m.membershipId === membershipId);
  if (!member) return;

  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  modalBody.innerHTML = `
    <h3 style="margin-bottom: 1rem;">Member Card - ${member.membershipId}</h3>
    <div id="modalCardPreview"></div>
    <div style="margin-top: 1.5rem; text-align: center;">
      <a href="success.html?id=${encodeURIComponent(member.membershipId)}" target="_blank" class="btn btn-primary btn-sm">Open Full Card View</a>
    </div>
  `;

  modal.classList.add('active');

  setTimeout(() => {
    const previewContainer = document.getElementById('modalCardPreview');
    if (previewContainer) {
      const displayMember = { ...member };
      const currentBaseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
      const verifyUrl = `${currentBaseUrl}/verify.html?id=${encodeURIComponent(member.membershipId)}`;
      
      previewContainer.innerHTML = `
        <div class="digital-card" style="transform: scale(0.9);">
          <div class="card-gold-stripe"></div>
          <div class="card-header-row">
            <div class="card-org-branding">
              <img src="${CONFIG.ORG_LOGO}" class="card-org-logo">
              <div>
                <div class="card-org-name">${CONFIG.ORG_NAME}</div>
                <div class="card-org-sub">OFFICIAL DIGITAL CARD</div>
              </div>
            </div>
            <span class="card-badge-type">${member.membershipType}</span>
          </div>
          <div class="card-body-row">
            <div class="card-photo-box">
              <img src="${member.photoUrl || CONFIG.ORG_LOGO}">
            </div>
            <div class="card-details-box">
              <div class="card-member-name">${member.fullName}</div>
              <div class="card-member-id">${member.membershipId}</div>
              <div class="card-info-grid">
                <div class="card-info-item"><span class="card-info-label">NATIONALITY</span><span class="card-info-val">${member.nationality || 'Indian'}</span></div>
                <div class="card-info-item"><span class="card-info-label">COUNTRY</span><span class="card-info-val">${member.residenceCountry || 'India'}</span></div>
                <div class="card-info-item"><span class="card-info-label">JOINED</span><span class="card-info-val">${formatDate(member.joiningDate)}</span></div>
                <div class="card-info-item"><span class="card-info-label">VALID UNTIL</span><span class="card-info-val">${member.validUntil || 'N/A'}</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }, 100);
}

/**
 * Toggle/Edit Status Modal
 */
function toggleStatusModal(membershipId, currentStatus) {
  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  modalBody.innerHTML = `
    <h3>Update Status: ${membershipId}</h3>
    <p style="color: var(--slate-600); margin: 0.5rem 0 1.5rem;">Select the updated status for this member record:</p>
    
    <div class="form-group" style="margin-bottom: 1.5rem;">
      <label class="form-label">Membership Status</label>
      <select id="newStatusSelect" class="form-control">
        <option value="Active" ${currentStatus === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Expired" ${currentStatus === 'Expired' ? 'selected' : ''}>Expired</option>
        <option value="Suspended" ${currentStatus === 'Suspended' ? 'selected' : ''}>Suspended</option>
      </select>
    </div>

    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
      <button class="btn btn-secondary" onclick="closeAdminModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStatusChange('${membershipId}')">Save Changes</button>
    </div>
  `;

  modal.classList.add('active');
}

/**
 * Save updated status to backend or DemoStore
 */
async function saveStatusChange(membershipId) {
  const newStatus = document.getElementById('newStatusSelect').value;
  showLoading('Updating member status...');

  try {
    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStatus',
          pin: currentAdminPin,
          membershipId,
          status: newStatus
        })
      });
      const result = await resp.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Status update failed.');
      }
    } else {
      DemoStore.updateStatus(membershipId, newStatus);
    }

    showToast(`Status updated to ${newStatus}`, 'success');
    closeAdminModal();
    fetchAdminData();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
  } finally {
    hideLoading();
  }
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('active');
}
