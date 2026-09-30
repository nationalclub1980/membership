/**
 * PROTECTED ADMIN DASHBOARD MANAGEMENT
 * National Arts & Sports Club Master Membership Portal
 */

let currentAdminPin = '';
let allAdminMembers = [];
let currentlyFilteredMembers = [];
let selectedMemberIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  const adminContainer = document.getElementById('adminApp');
  if (!adminContainer) return;

  // Check if session pin already exists in sessionStorage
  const savedPin = sessionStorage.getItem('nasc_admin_pin');
  if (savedPin) {
    currentAdminPin = savedPin;
    authenticateAndUnlock(savedPin, false);
  } else {
    initAdminAuth();
  }
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
      showToast('Please enter the Admin Passcode', 'warning');
      return;
    }

    await authenticateAndUnlock(pinInput, true);
  });
}

/**
 * Authenticate PIN against Google Apps Script backend or DemoStore
 */
async function authenticateAndUnlock(pin, showFeedback = true) {
  if (showFeedback) showLoading('Authenticating administrator session...');
  try {
    let isAuthenticated = false;

    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(`${CONFIG.WEB_APP_URL}?action=adminLogin&pin=${encodeURIComponent(pin)}`);
      const result = await resp.json();
      isAuthenticated = (result.status === 'success');
    } else {
      // Offline local demo mode validation
      isAuthenticated = (pin === CONFIG.DEMO_ONLY_PASSCODE);
    }

    if (isAuthenticated) {
      currentAdminPin = pin;
      sessionStorage.setItem('nasc_admin_pin', pin);

      document.getElementById('adminAuthSection').style.display = 'none';
      document.getElementById('adminDashboardSection').style.display = 'block';

      if (showFeedback) showToast('Admin authenticated successfully!', 'success');
      
      initAdminControls();
      fetchAdminData();
    } else {
      sessionStorage.removeItem('nasc_admin_pin');
      if (showFeedback) showToast('Invalid Admin Passcode. Access denied.', 'danger');
    }
  } catch (err) {
    console.error('Admin Auth Error:', err);
    if (showFeedback) showToast('Authentication check failed. Please check network connection.', 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Admin Logout
 */
function logoutAdmin() {
  currentAdminPin = '';
  sessionStorage.removeItem('nasc_admin_pin');
  allAdminMembers = [];
  currentlyFilteredMembers = [];
  selectedMemberIds.clear();

  document.getElementById('adminAuthSection').style.display = 'block';
  document.getElementById('adminDashboardSection').style.display = 'none';
  document.getElementById('adminPinInput').value = '';
  showToast('Admin logged out safely.', 'info');
}

/**
 * Fetch member records from backend
 */
async function fetchAdminData() {
  showLoading('Loading master membership database...');
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

    selectedMemberIds.clear();
    updateBulkSelectionUI();
    applyAdminFilters();
  } catch (err) {
    console.error('Fetch Admin Data Error:', err);
    showToast('Unable to load member database. Please check connection.', 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Render Metrics Grid and Table Rows
 */
function renderAdminDashboard(members) {
  currentlyFilteredMembers = members;

  // 1. Calculate Metrics
  const totalCount = allAdminMembers.length;
  const activeCount = allAdminMembers.filter(m => (m.status || 'Active').toLowerCase() === 'active').length;
  const pendingCount = allAdminMembers.filter(m => (m.status || '').toLowerCase() === 'pending').length;
  const expiredCount = allAdminMembers.filter(m => {
    const st = (m.status || '').toLowerCase();
    return st === 'expired' || st === 'suspended';
  }).length;

  document.getElementById('statTotalMembers').textContent = totalCount;
  document.getElementById('statActiveMembers').textContent = activeCount;
  document.getElementById('statPendingMembers').textContent = pendingCount;
  document.getElementById('statExpiredMembers').textContent = expiredCount;

  // 2. Render Table Rows
  const tbody = document.getElementById('adminMembersTbody');
  if (!tbody) return;

  if (members.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 2.5rem; color: var(--slate-500);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <strong>No member records found</strong>
          <p style="font-size: 0.85rem; color: var(--slate-400); margin-top: 0.25rem;">Try resetting your search query or status filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    const allFilteredSelected = members.length > 0 && members.every(m => selectedMemberIds.has(m.membershipId));
    selectAllCheckbox.checked = allFilteredSelected;
  }

  tbody.innerHTML = members.map(m => {
    const st = (m.status || 'Active').toLowerCase();
    let badgeClass = 'badge-active';
    if (st === 'pending') badgeClass = 'badge-pending';
    if (st === 'expired' || st === 'suspended') badgeClass = 'badge-expired';

    const regType = m.registrationType || 'New Member';
    const regTypeBadgeClass = regType === 'Renewal' ? 'badge-renewal' : 'badge-new';
    const isChecked = selectedMemberIds.has(m.membershipId) ? 'checked' : '';

    const photoUrl = formatDriveImageUrl(m.photoUrl);
    const photoLink = m.photoUrl ? `<a href="${m.photoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.55rem;">🔗 View Link</a>` : '<span style="color: var(--slate-400); font-size: 0.8rem;">No Photo</span>';

    return `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="member-checkbox" data-id="${m.membershipId}" ${isChecked}>
        </td>
        <td><strong>${m.membershipId}</strong></td>
        <td>
          <img 
            src="${photoUrl}" 
            alt="${m.fullName}"
            style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--border-color); cursor: pointer; background-color: var(--slate-100);"
            onclick="openPhotoPreviewModal('${m.photoUrl}', '${escapeHtml(m.fullName)}')"
            title="Click to zoom photo"
            onerror="this.src='assets/club-logo.png'"
          >
        </td>
        <td>
          <strong style="color: var(--slate-900);">${escapeHtml(m.fullName)}</strong>
        </td>
        <td>${escapeHtml(m.phone || 'N/A')}</td>
        <td><span style="font-size: 0.85rem; color: var(--slate-600);">${escapeHtml(m.email || 'N/A')}</span></td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.15rem;">
            <span class="badge ${regTypeBadgeClass}">${regType}</span>
            <span style="font-size: 0.75rem; color: var(--slate-500);">${escapeHtml(m.membershipType || 'Adult Membership')}</span>
          </div>
        </td>
        <td><span style="font-size: 0.85rem; color: var(--slate-600);">${formatDate(m.joiningDate)}</span></td>
        <td><span class="badge ${badgeClass}">${m.status || 'Active'}</span></td>
        <td>${photoLink}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="viewMemberDetailsModal('${m.membershipId}')" title="View details">👁️ View</button>
            <button class="btn btn-outline-primary btn-sm" onclick="openEditMemberModal('${m.membershipId}')" title="Edit member">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" style="color: var(--danger-600);" onclick="confirmDeleteSingleMember('${m.membershipId}')" title="Delete record">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach Checkbox Change Handlers
  tbody.querySelectorAll('.member-checkbox').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedMemberIds.add(id);
      } else {
        selectedMemberIds.delete(id);
      }
      updateBulkSelectionUI();
    });
  });
}

/**
 * Initialize Filters, Controls, and Event Handlers
 */
function initAdminControls() {
  const searchInput = document.getElementById('adminSearchInput');
  const statusFilter = document.getElementById('adminStatusFilter');
  const typeFilter = document.getElementById('adminTypeFilter');
  const sortSelect = document.getElementById('adminSortSelect');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');

  const exportAllBtn = document.getElementById('exportExcelAllBtn');
  const exportFilteredBtn = document.getElementById('exportExcelFilteredBtn');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

  if (searchInput) searchInput.addEventListener('input', applyAdminFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyAdminFilters);
  if (typeFilter) typeFilter.addEventListener('change', applyAdminFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyAdminFilters);

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      currentlyFilteredMembers.forEach(m => {
        if (isChecked) {
          selectedMemberIds.add(m.membershipId);
        } else {
          selectedMemberIds.delete(m.membershipId);
        }
      });
      renderAdminDashboard(currentlyFilteredMembers);
      updateBulkSelectionUI();
    });
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
      selectedMemberIds.clear();
      renderAdminDashboard(currentlyFilteredMembers);
      updateBulkSelectionUI();
    });
  }

  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', confirmBulkDelete);
  }

  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => exportToExcel(allAdminMembers, 'All_Members'));
  }

  if (exportFilteredBtn) {
    exportFilteredBtn.addEventListener('click', () => exportToExcel(currentlyFilteredMembers, 'Filtered_Members'));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutAdmin);
  }
}

/**
 * Apply Search, Filter, and Sort logic to master list
 */
function applyAdminFilters() {
  const q = (document.getElementById('adminSearchInput')?.value || '').toLowerCase().trim();
  const st = (document.getElementById('adminStatusFilter')?.value || 'all').toLowerCase();
  const tp = (document.getElementById('adminTypeFilter')?.value || 'all').toLowerCase();
  const sort = document.getElementById('adminSortSelect')?.value || 'newest';

  let filtered = allAdminMembers.filter(m => {
    const matchSearch = 
      !q ||
      (m.membershipId && m.membershipId.toLowerCase().includes(q)) ||
      (m.fullName && m.fullName.toLowerCase().includes(q)) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.address && m.address.toLowerCase().includes(q));

    const matchStatus = st === 'all' || (m.status || 'active').toLowerCase() === st;
    const matchType = tp === 'all' || (m.membershipType || 'adult').toLowerCase().includes(tp);

    return matchSearch && matchStatus && matchType;
  });

  // Apply Sorting
  filtered.sort((a, b) => {
    if (sort === 'newest') {
      return new Date(b.registrationTimestamp || b.joiningDate || 0) - new Date(a.registrationTimestamp || a.joiningDate || 0);
    }
    if (sort === 'oldest') {
      return new Date(a.registrationTimestamp || a.joiningDate || 0) - new Date(b.registrationTimestamp || b.joiningDate || 0);
    }
    if (sort === 'name_asc') {
      return a.fullName.localeCompare(b.fullName);
    }
    if (sort === 'name_desc') {
      return b.fullName.localeCompare(a.fullName);
    }
    if (sort === 'id_asc') {
      return a.membershipId.localeCompare(b.membershipId);
    }
    if (sort === 'status') {
      return (a.status || '').localeCompare(b.status || '');
    }
    return 0;
  });

  renderAdminDashboard(filtered);
}

/**
 * Update Bulk Actions Toolbar State
 */
function updateBulkSelectionUI() {
  const bulkBar = document.getElementById('bulkActionBar');
  const countLabel = document.getElementById('bulkSelectedCount');
  if (!bulkBar || !countLabel) return;

  const count = selectedMemberIds.size;
  if (count > 0) {
    bulkBar.style.display = 'flex';
    countLabel.textContent = `${count} member record(s) selected`;
  } else {
    bulkBar.style.display = 'none';
  }
}

/**
 * Single Member Delete Confirmation Dialog
 */
function confirmDeleteSingleMember(membershipId) {
  const member = allAdminMembers.find(m => m.membershipId === membershipId);
  if (!member) return;

  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  modalBody.innerHTML = `
    <div style="text-align: center; padding: 1rem 0;">
      <div style="font-size: 3rem; color: var(--danger-500); margin-bottom: 0.5rem;">🛑</div>
      <h2 style="margin-bottom: 0.5rem; color: var(--slate-900);">Delete Member Record?</h2>
      <p style="color: var(--slate-600); margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5;">
        Are you sure you want to permanently delete member <strong>${escapeHtml(member.fullName)}</strong> (<code>${member.membershipId}</code>)?
      </p>
      
      <div style="background-color: var(--danger-50); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--danger-600);">
        ⚠️ <strong>Warning:</strong> This action is permanent and will remove the member from the central database.
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: center;">
        <button class="btn btn-secondary" onclick="closeAdminModal()">Cancel</button>
        <button class="btn btn-gold" style="background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff;" onclick="executeDeleteSingleMember('${member.membershipId}')">
          Delete Member
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

/**
 * Execute Single Delete API Call
 */
async function executeDeleteSingleMember(membershipId) {
  closeAdminModal();
  showLoading('Deleting member record...');

  try {
    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteMember',
          pin: currentAdminPin,
          membershipId: membershipId,
          memberId: membershipId
        })
      });

      let result = null;
      try {
        result = await resp.json();
      } catch (e) {
        console.error('Non-JSON response received from Google Apps Script backend:', e);
      }



      if (result && (result.status === 'success' || result.success === true)) {
        allAdminMembers = allAdminMembers.filter(m => m.membershipId !== membershipId);
        selectedMemberIds.delete(membershipId);
        showToast(result.message || 'Member deleted successfully.', 'success');
        updateBulkSelectionUI();
        applyAdminFilters();
        return;
      }

      const errMsg = result ? (result.message || result.error || '') : '';
      if (errMsg.includes('Invalid POST action')) {
        console.warn('Backend Apps Script deployment returned Invalid POST action. Executing legacy status fallback...');
        await fetch(CONFIG.WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateStatus',
            pin: currentAdminPin,
            membershipId: membershipId,
            status: 'Expired'
          })
        });

        allAdminMembers = allAdminMembers.filter(m => m.membershipId !== membershipId);
        selectedMemberIds.delete(membershipId);
        showToast('Member removed from dashboard (Update Apps Script deployment for permanent Sheet row deletion).', 'warning');
        updateBulkSelectionUI();
        applyAdminFilters();
        return;
      }

      throw new Error(errMsg || 'Failed to delete member record.');
    } else {
      DemoStore.deleteMember(membershipId);
      allAdminMembers = allAdminMembers.filter(m => m.membershipId !== membershipId);
      selectedMemberIds.delete(membershipId);
      showToast('Member deleted successfully.', 'success');
      updateBulkSelectionUI();
      applyAdminFilters();
    }
  } catch (err) {
    console.error('Delete Member Error:', err);
    showToast(`Error: ${err.message || 'Member could not be deleted.'}`, 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Bulk Delete Confirmation Dialog
 */
function confirmBulkDelete() {
  const idsArray = Array.from(selectedMemberIds);
  if (idsArray.length === 0) return;

  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  modalBody.innerHTML = `
    <div style="text-align: center; padding: 1rem 0;">
      <div style="font-size: 3rem; color: var(--danger-500); margin-bottom: 0.5rem;">⚠️</div>
      <h2 style="margin-bottom: 0.5rem; color: var(--slate-900);">Bulk Delete Confirmation</h2>
      <p style="color: var(--slate-600); margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5;">
        You are about to permanently delete <strong>${idsArray.length}</strong> selected member records.
      </p>

      <div style="background-color: var(--danger-50); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--danger-600);">
        ⚠️ <strong>Caution:</strong> Deleting multiple members cannot be undone. Please verify before proceeding.
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: center;">
        <button class="btn btn-secondary" onclick="closeAdminModal()">Cancel</button>
        <button class="btn btn-gold" style="background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff;" onclick="executeBulkDelete()">
          Confirm Bulk Delete (${idsArray.length})
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

/**
 * Execute Bulk Delete API Call
 */
async function executeBulkDelete() {
  const idsArray = Array.from(selectedMemberIds);
  closeAdminModal();
  showLoading(`Deleting ${idsArray.length} member records...`);

  try {
    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'bulkDelete',
          pin: currentAdminPin,
          ids: idsArray,
          memberIds: idsArray
        })
      });

      let result = null;
      try {
        result = await resp.json();
      } catch (e) {
        console.error('Non-JSON response received from Google Apps Script backend:', e);
      }



      if (result && (result.status === 'success' || result.success === true)) {
        const idsSet = new Set(idsArray);
        allAdminMembers = allAdminMembers.filter(m => !idsSet.has(m.membershipId));
        selectedMemberIds.clear();
        showToast(result.message || `${idsArray.length} member records deleted successfully.`, 'success');
        updateBulkSelectionUI();
        applyAdminFilters();
        return;
      }

      const errMsg = result ? (result.message || result.error || '') : '';
      if (errMsg.includes('Invalid POST action')) {
        console.warn('Backend Apps Script deployment returned Invalid POST action. Executing legacy status fallback for bulk items...');
        for (const id of idsArray) {
          await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'updateStatus',
              pin: currentAdminPin,
              membershipId: id,
              status: 'Expired'
            })
          });
        }

        const idsSet = new Set(idsArray);
        allAdminMembers = allAdminMembers.filter(m => !idsSet.has(m.membershipId));
        selectedMemberIds.clear();
        showToast(`${idsArray.length} member records removed from dashboard (Update Apps Script deployment for permanent Sheet row deletion).`, 'warning');
        updateBulkSelectionUI();
        applyAdminFilters();
        return;
      }

      throw new Error(errMsg || 'Failed to bulk delete member records.');
    } else {
      DemoStore.bulkDeleteMembers(idsArray);
      const idsSet = new Set(idsArray);
      allAdminMembers = allAdminMembers.filter(m => !idsSet.has(m.membershipId));
      selectedMemberIds.clear();
      showToast(`${idsArray.length} member records deleted successfully.`, 'success');
      updateBulkSelectionUI();
      applyAdminFilters();
    }
  } catch (err) {
    console.error('Bulk Delete Error:', err);
    showToast(`Error: ${err.message || 'Bulk delete failed.'}`, 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Export Membership Database to Excel (.xlsx) file
 */
function exportToExcel(targetMembers, label = 'Export') {
  if (!targetMembers || targetMembers.length === 0) {
    showToast('No member records available to export', 'warning');
    return;
  }

  showLoading('Preparing Excel spreadsheet...');
  try {
    // Format dataset with full existing database fields and clean photo URLs
    const exportRows = targetMembers.map(m => ({
      "Member ID": m.membershipId,
      "Registration Type": m.registrationType || 'New Member',
      "Full Name": m.fullName,
      "Date of Birth": m.dob || '',
      "Gender": m.gender || '',
      "Nationality": m.nationality || 'Indian',
      "Country of Residence": m.residenceCountry || 'India',
      "Phone Number": m.phone ? `'${m.phone}` : '', // Prefix with apostrophe to keep phone format in Excel
      "WhatsApp": m.whatsapp ? `'${m.whatsapp}` : '',
      "Email": m.email || '',
      "Address": m.address || '',
      "District": m.district || '',
      "State": m.state || '',
      "PIN Code": m.pinCode || '',
      "Blood Group": m.bloodGroup || '',
      "Membership Type": m.membershipType || 'Adult Membership',
      "Joining Date": m.joiningDate || '',
      "Valid From": m.validFrom || '',
      "Valid Until": m.validUntil || '',
      "Membership Status": m.status || 'Active',
      "Registration Timestamp": m.registrationTimestamp || '',
      "Photo Link": m.photoUrl || '' // Includes exact accessible photo URL
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `National-Arts-Sports-Club-Members-${dateStr}.xlsx`;

    if (window.XLSX) {
      // Create worksheet with SheetJS
      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto-set Column Widths
      const colWidths = [
        { wch: 18 }, // Member ID
        { wch: 16 }, // Registration Type
        { wch: 24 }, // Full Name
        { wch: 14 }, // DOB
        { wch: 10 }, // Gender
        { wch: 12 }, // Nationality
        { wch: 18 }, // Residence
        { wch: 16 }, // Phone
        { wch: 16 }, // WhatsApp
        { wch: 24 }, // Email
        { wch: 30 }, // Address
        { wch: 14 }, // District
        { wch: 14 }, // State
        { wch: 10 }, // PIN
        { wch: 12 }, // Blood Group
        { wch: 16 }, // Type
        { wch: 14 }, // Joining Date
        { wch: 14 }, // Valid From
        { wch: 14 }, // Valid Until
        { wch: 14 }, // Status
        { wch: 24 }, // Timestamp
        { wch: 50 }  // Photo Link
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Club Members");

      XLSX.writeFile(workbook, fileName);
      showToast(`Excel spreadsheet (${targetMembers.length} records) exported successfully!`, 'success');
    } else {
      // Fallback CSV export
      exportToCsv(exportRows, fileName.replace('.xlsx', '.csv'));
    }
  } catch (err) {
    console.error('Export Error:', err);
    showToast('Excel export failed. Please try again.', 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Fallback CSV export if SheetJS XLSX is unavailable
 */
function exportToCsv(rows, fileName) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]).join(',');
  const csvLines = rows.map(r => 
    Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvLines].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * View Member Details Modal
 */
function viewMemberDetailsModal(membershipId) {
  const member = allAdminMembers.find(m => m.membershipId === membershipId);
  if (!member) return;

  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  const photoUrl = formatDriveImageUrl(member.photoUrl);
  const photoLink = member.photoUrl ? `<a href="${member.photoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">🔗 Open Photo URL</a>` : '<span style="color: var(--slate-400);">No photo uploaded</span>';

  modalBody.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.25rem;">
      <div>
        <h2 style="font-size: 1.4rem;">Member Details</h2>
        <span style="font-family: monospace; font-size: 0.95rem; font-weight: 700; color: var(--primary-600);">${member.membershipId}</span>
      </div>
      <span class="badge ${member.status === 'Active' ? 'badge-active' : 'badge-expired'}">${member.status || 'Active'}</span>
    </div>

    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
      <div style="text-align: center;">
        <img 
          src="${photoUrl}" 
          style="width: 110px; height: 110px; border-radius: var(--radius-md); object-fit: cover; border: 2px solid var(--primary-200); box-shadow: var(--shadow-sm); background-color: var(--slate-100);"
          onerror="this.src='assets/club-logo.png'"
        >
        <div style="margin-top: 0.65rem;">
          ${photoLink}
        </div>
      </div>

      <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem;">
        <div>
          <div class="verify-detail-label">Full Name</div>
          <div style="font-weight: 700; color: var(--slate-900);">${escapeHtml(member.fullName)}</div>
        </div>

        <div>
          <div class="verify-detail-label">Phone Number</div>
          <div style="font-weight: 600;">${escapeHtml(member.phone || 'N/A')}</div>
        </div>

        <div>
          <div class="verify-detail-label">Email Address</div>
          <div style="font-weight: 600;">${escapeHtml(member.email || 'N/A')}</div>
        </div>

        <div>
          <div class="verify-detail-label">Date of Birth</div>
          <div style="font-weight: 600;">${formatDate(member.dob)}</div>
        </div>

        <div>
          <div class="verify-detail-label">Gender</div>
          <div style="font-weight: 600;">${escapeHtml(member.gender || 'N/A')}</div>
        </div>

        <div>
          <div class="verify-detail-label">Blood Group</div>
          <div style="font-weight: 600;">${escapeHtml(member.bloodGroup || 'N/A')}</div>
        </div>

        <div>
          <div class="verify-detail-label">Membership Type</div>
          <div style="font-weight: 600;">${escapeHtml(member.membershipType || 'Adult Membership')} (${escapeHtml(member.registrationType || 'New Member')})</div>
        </div>

        <div>
          <div class="verify-detail-label">Joining Date</div>
          <div style="font-weight: 600;">${formatDate(member.joiningDate)}</div>
        </div>
      </div>
    </div>

    <div style="background-color: var(--slate-50); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200); margin-bottom: 1.5rem;">
      <div class="verify-detail-label">Address</div>
      <div style="font-weight: 600; color: var(--slate-800);">${escapeHtml(member.address || 'N/A')}, ${escapeHtml(member.district || '')}, ${escapeHtml(member.state || '')} - ${escapeHtml(member.pinCode || '')}</div>
    </div>

    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
      <button class="btn btn-secondary" onclick="closeAdminModal()">Close</button>
      <button class="btn btn-outline-primary" onclick="openEditMemberModal('${member.membershipId}')">✏️ Edit Member</button>
      <button class="btn btn-gold" style="background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff;" onclick="confirmDeleteSingleMember('${member.membershipId}')">🗑️ Delete Member</button>
    </div>
  `;

  modal.classList.add('active');
}

/**
 * Open Edit Member Modal Form
 */
function openEditMemberModal(membershipId) {
  const member = allAdminMembers.find(m => m.membershipId === membershipId);
  if (!member) return;

  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  modalBody.innerHTML = `
    <h3 style="margin-bottom: 1rem;">Edit Member Record - ${member.membershipId}</h3>
    
    <form id="editMemberForm" onsubmit="saveMemberEdit(event, '${member.membershipId}')">
      <div class="form-grid">
        <div class="form-group form-group-half">
          <label class="form-label">Full Name <span class="required-asterisk">*</span></label>
          <input type="text" id="editFullName" class="form-control" value="${escapeHtml(member.fullName)}" required>
        </div>

        <div class="form-group form-group-half">
          <label class="form-label">Phone Number <span class="required-asterisk">*</span></label>
          <input type="tel" id="editPhone" class="form-control" value="${escapeHtml(member.phone || '')}" required>
        </div>

        <div class="form-group form-group-half">
          <label class="form-label">Email Address</label>
          <input type="email" id="editEmail" class="form-control" value="${escapeHtml(member.email || '')}">
        </div>

        <div class="form-group form-group-half">
          <label class="form-label">Membership Status</label>
          <select id="editStatus" class="form-control">
            <option value="Active" ${member.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Pending" ${member.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Expired" ${member.status === 'Expired' ? 'selected' : ''}>Expired</option>
            <option value="Suspended" ${member.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
          </select>
        </div>

        <div class="form-group form-group-third">
          <label class="form-label">Membership Type</label>
          <select id="editMembershipType" class="form-control">
            <option value="Child Membership" ${member.membershipType === 'Child Membership' ? 'selected' : ''}>Child Membership (Up to 15 Years)</option>
            <option value="Youth Membership" ${member.membershipType === 'Youth Membership' ? 'selected' : ''}>Youth Membership (16–20 Years)</option>
            <option value="Adult Membership" ${member.membershipType === 'Adult Membership' || !member.membershipType ? 'selected' : ''}>Adult Membership (21+ Years)</option>
            <option value="Overseas / Pravasi Membership" ${member.membershipType === 'Overseas / Pravasi Membership' ? 'selected' : ''}>Overseas / Pravasi Membership</option>
          </select>
        </div>

        <div class="form-group form-group-third">
          <label class="form-label">Date of Birth</label>
          <input type="date" id="editDob" class="form-control" value="${member.dob || ''}">
        </div>

        <div class="form-group form-group-third">
          <label class="form-label">Blood Group</label>
          <input type="text" id="editBloodGroup" class="form-control" value="${escapeHtml(member.bloodGroup || '')}">
        </div>

        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" id="editAddress" class="form-control" value="${escapeHtml(member.address || '')}">
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeAdminModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Member Changes</button>
      </div>
    </form>
  `;

  modal.classList.add('active');
}

/**
 * Save edited member record to backend
 */
async function saveMemberEdit(e, membershipId) {
  e.preventDefault();
  showLoading('Saving member record updates...');

  const updatedData = {
    fullName: document.getElementById('editFullName').value.trim(),
    phone: document.getElementById('editPhone').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    status: document.getElementById('editStatus').value,
    membershipType: document.getElementById('editMembershipType').value,
    dob: document.getElementById('editDob').value,
    bloodGroup: document.getElementById('editBloodGroup').value.trim(),
    address: document.getElementById('editAddress').value.trim()
  };

  try {
    if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
      const resp = await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateMember',
          pin: currentAdminPin,
          membershipId: membershipId,
          memberData: updatedData
        })
      });
      const result = await resp.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Update failed.');
      }
    } else {
      DemoStore.updateMember(membershipId, updatedData);
    }

    showToast('Member record updated successfully.', 'success');
    closeAdminModal();
    fetchAdminData();
  } catch (err) {
    showToast(`Error: ${err.message || 'Failed to update member.'}`, 'danger');
  } finally {
    hideLoading();
  }
}

/**
 * Open enlarged photo preview modal
 */
function openPhotoPreviewModal(photoUrl, memberName) {
  if (!photoUrl) return;

  const modal = document.getElementById('adminModal');
  const modalBody = document.getElementById('adminModalBody');

  const formattedUrl = formatDriveImageUrl(photoUrl);

  modalBody.innerHTML = `
    <div style="text-align: center;">
      <h3 style="margin-bottom: 0.25rem;">${escapeHtml(memberName)}</h3>
      <p style="font-size: 0.82rem; color: var(--slate-500); margin-bottom: 1.25rem;">Member Photo Preview</p>
      
      <div style="background-color: var(--slate-900); padding: 0.75rem; border-radius: var(--radius-md); display: inline-block; margin-bottom: 1.25rem; max-width: 100%;">
        <img 
          src="${formattedUrl}" 
          style="max-width: 100%; max-height: 380px; object-fit: contain; border-radius: 4px;"
          onerror="this.src='assets/club-logo.png'"
        >
      </div>

      <div>
        <a href="${photoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
          🔗 Open Original Photo URL
        </a>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('active');
}

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
