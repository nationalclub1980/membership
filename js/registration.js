/**
 * MEMBERSHIP REGISTRATION FORM LOGIC AND VALIDATION
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('membershipForm');
  if (!form) return;

  initFormDefaults();
  initPhotoPreview();
  initFormValidation(form);
});

/**
  * Calculate Age from Date of Birth String
  */
function calculateAge(dobString) {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Populate Membership Types and default dates
 */
function initFormDefaults() {
  const typeSelect = document.getElementById('membershipType');
  if (typeSelect && CONFIG.MEMBERSHIP_TYPES) {
    typeSelect.innerHTML = CONFIG.MEMBERSHIP_TYPES.map(t => 
      `<option value="${t.id}">${t.name} — ${t.fee}</option>`
    ).join('');
  }

  const joiningDateInput = document.getElementById('joiningDate');
  if (joiningDateInput) {
    const today = new Date().toISOString().split('T')[0];
    joiningDateInput.value = today;
  }

  const dobInput = document.getElementById('dob');
  if (dobInput) {
    const today = new Date().toISOString().split('T')[0];
    dobInput.setAttribute('max', today);

    // Auto-suggest membership tier based on DOB age if user has not picked Overseas / Pravasi Membership
    dobInput.addEventListener('change', () => {
      const dobVal = dobInput.value;
      if (!dobVal || !typeSelect) return;
      const age = calculateAge(dobVal);
      const currentSelected = typeSelect.value || '';
      
      if (currentSelected.includes('Overseas') || currentSelected.includes('Pravasi')) {
        return; // Retain Overseas selection
      }

      if (age < 15) {
        typeSelect.value = "Child Membership";
      } else if (age >= 15 && age <= 25) {
        typeSelect.value = "Youth Membership";
      } else {
        typeSelect.value = "Adult Membership";
      }
    });
  }

  const termsCheckbox = document.getElementById('termsAccepted');
  const termsFeedback = document.getElementById('termsInvalidFeedback');
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', () => {
      if (termsCheckbox.checked) {
        termsCheckbox.classList.remove('is-invalid');
        if (termsFeedback) termsFeedback.style.display = 'none';
      }
    });
  }
}

/**
 * Handle Photo Upload Preview and Convert to Base64
 */
let uploadedPhotoBase64 = '';
let uploadedPhotoFile = null;
let rawOriginalPhotoBase64 = '';

function initPhotoPreview() {
  const photoInput = document.getElementById('profilePhoto');
  const previewImg = document.getElementById('photoPreview');
  const uploadText = document.getElementById('photoUploadText');
  const dropzone = document.getElementById('photoDropzone');

  if (!photoInput) return;

  const handleFileSelect = (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!file.type || !validTypes.includes(file.type.toLowerCase())) {
      showToast('Please upload a valid image file (JPG, PNG, WEBP)', 'danger');
      photoInput.value = '';
      return;
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(`Image file size must be less than ${maxSizeMB}MB`, 'danger');
      photoInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      rawOriginalPhotoBase64 = evt.target.result;
      
      // Open Passport Photo Crop Modal
      openPhotoCropModal(rawOriginalPhotoBase64, (croppedBase64, croppedFile) => {
        uploadedPhotoBase64 = croppedBase64;
        uploadedPhotoFile = croppedFile;
        if (previewImg) {
          previewImg.src = uploadedPhotoBase64;
          previewImg.style.display = 'block';
        }
        if (uploadText) {
          uploadText.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; position: relative; z-index: 10;">
              <span style="color: var(--emerald-600, #059669); font-weight: 700; font-size: 1.05rem; display: flex; align-items: center; gap: 0.35rem;">
                <span>✓</span> Photo Ready
              </span>
              <span style="font-size: 0.8rem; color: var(--slate-500);">Passport-style 3:4 portrait photo</span>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem; flex-wrap: wrap; justify-content: center;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="reopenCropModal(event)" style="padding: 0.3rem 0.75rem; font-size: 0.82rem; position: relative; z-index: 10;">
                  ✏️ Recrop Photo
                </button>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="triggerPhotoFileInput(event)" style="padding: 0.3rem 0.75rem; font-size: 0.82rem; position: relative; z-index: 10;">
                  📁 Choose Different File
                </button>
              </div>
            </div>
          `;
        }
      });
    };
    reader.readAsDataURL(file);
  };

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }
}

function triggerPhotoFileInput(e) {
  if (e) e.stopPropagation();
  const input = document.getElementById('profilePhoto');
  if (input) input.click();
}

function reopenCropModal(e) {
  if (e) e.stopPropagation();
  if (rawOriginalPhotoBase64) {
    openPhotoCropModal(rawOriginalPhotoBase64, (croppedBase64, croppedFile) => {
      uploadedPhotoBase64 = croppedBase64;
      uploadedPhotoFile = croppedFile;
      const previewImg = document.getElementById('photoPreview');
      if (previewImg) previewImg.src = croppedBase64;
    });
  } else {
    triggerPhotoFileInput(e);
  }
}

/**
 * Resize and compress uploaded photo for optimal payload size
 */
function compressImage(base64Str, maxWidth, maxHeight, quality, callback) {
  const img = new Image();
  img.onload = () => {
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL('image/jpeg', quality);
    callback(compressed);
  };
  img.onerror = () => callback(base64Str);
  img.src = base64Str;
}

/**
 * Form Validation and Submission Handler
 */
function initFormValidation(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));

    // Form inputs
    const fullName = document.getElementById('fullName').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const nationality = document.getElementById('nationality') ? document.getElementById('nationality').value.trim() : 'Indian';
    const residenceCountry = document.getElementById('residenceCountry') ? document.getElementById('residenceCountry').value.trim() : 'India';
    const phone = document.getElementById('phone').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim() || phone;
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const district = document.getElementById('district').value.trim();
    const state = document.getElementById('state').value.trim();
    const pinCode = document.getElementById('pinCode').value.trim();
    const bloodGroup = document.getElementById('bloodGroup').value;
    const membershipType = document.getElementById('membershipType').value;
    const joiningDate = document.getElementById('joiningDate').value;

    let isValid = true;

    // Validation checks
    if (!fullName) { markInvalid('fullName'); isValid = false; }
    // DOB Validation (Must not be in the future)
    const todayStr = new Date().toISOString().split('T')[0];
    if (!dob || dob > todayStr) {
      markInvalid('dob');
      showToast('Date of Birth cannot be in the future', 'danger');
      isValid = false;
    }

    // Age & Membership Category Consistency Validation
    if (dob && dob <= todayStr && membershipType) {
      const age = calculateAge(dob);
      const isOverseas = membershipType.includes('Overseas') || membershipType.includes('Pravasi');

      if (!isOverseas) {
        if (membershipType.includes('Child') && age > 15) {
          markInvalid('membershipType');
          showToast(`Child Membership is for applicants up to 15 years old. Applicant is ${age} years old.`, 'danger');
          isValid = false;
        } else if (membershipType.includes('Youth') && (age < 15 || age > 25)) {
          markInvalid('membershipType');
          showToast(`Youth Membership is for applicants between 15 and 25 years old. Applicant is ${age} years old.`, 'danger');
          isValid = false;
        } else if (membershipType.includes('Adult') && age <= 25) {
          markInvalid('membershipType');
          showToast(`Adult Membership is for applicants above 25 years old. Applicant is ${age} years old.`, 'danger');
          isValid = false;
        }
      }
    }

    if (!gender) { markInvalid('gender'); isValid = false; }
    if (!nationality) { markInvalid('nationality'); isValid = false; }
    if (!residenceCountry) { markInvalid('residenceCountry'); isValid = false; }

    // Phone validation
    const phoneRegex = /^[+]?[0-9\s\-]{8,15}$/;
    if (!phone || !phoneRegex.test(phone)) {
      markInvalid('phone');
      isValid = false;
    }

    // Optional WhatsApp validation (if provided)
    if (whatsapp && !phoneRegex.test(whatsapp)) {
      markInvalid('whatsapp');
      showToast('Please enter a valid WhatsApp phone number', 'danger');
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      markInvalid('email');
      isValid = false;
    }

    if (!address) { markInvalid('address'); isValid = false; }
    if (!district) { markInvalid('district'); isValid = false; }
    if (!state) { markInvalid('state'); isValid = false; }
    if (!pinCode) { markInvalid('pinCode'); isValid = false; }

    // Terms & Conditions Declaration Check
    const termsCheckbox = document.getElementById('termsAccepted');
    const termsFeedback = document.getElementById('termsInvalidFeedback');
    const termsAccepted = termsCheckbox ? termsCheckbox.checked : false;

    if (!termsAccepted) {
      if (termsCheckbox) termsCheckbox.classList.add('is-invalid');
      if (termsFeedback) termsFeedback.style.display = 'block';
      showToast('അംഗത്വ സത്യപ്രസ്താവന അംഗീകരിച്ച ശേഷം മാത്രം അപേക്ഷ സമർപ്പിക്കാവുന്നതാണ്.', 'danger');
      isValid = false;
    } else {
      if (termsCheckbox) termsCheckbox.classList.remove('is-invalid');
      if (termsFeedback) termsFeedback.style.display = 'none';
    }

    // Photo check (Required for new registrations; optional for renewal)
    const registrationType = form.dataset.registrationType || 'New Member';
    if (!uploadedPhotoBase64 && registrationType !== 'Renewal') {
      showToast('Please upload and confirm a profile photo before submitting', 'danger');
      isValid = false;
    }

    if (!isValid) {
      if (termsAccepted) {
        showToast('Please fill out all required fields correctly', 'danger');
      }
      return;
    }

    const termsAcceptedAt = new Date().toISOString();

    // Prepare payload
    const payload = {
      action: 'register',
      registrationType,
      fullName,
      photoBase64: uploadedPhotoBase64,
      dob,
      gender,
      nationality,
      residenceCountry,
      phone,
      whatsapp,
      email,
      address,
      district,
      state,
      pinCode,
      bloodGroup,
      membershipType,
      joiningDate,
      termsAccepted: true,
      termsAcceptedAt: termsAcceptedAt
    };

    // Disable button to prevent duplicate submissions
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    showLoading(`${registrationType === 'Renewal' ? 'Processing membership renewal' : 'Registering new member'} and generating digital card...`);

    try {
      let registeredMember = null;

      // Check if backend Apps Script URL is provided
      if (CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL")) {
        // Send to Google Apps Script backend via POST
        const response = await fetch(CONFIG.WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === 'success') {
          registeredMember = result.data || {};
          const backendPhoto = registeredMember.photoUrl || registeredMember.photoBase64 || registeredMember.photo || '';
          registeredMember.photoUrl = backendPhoto || uploadedPhotoBase64;
          registeredMember.photoBase64 = registeredMember.photoUrl;
          registeredMember.photo = registeredMember.photoUrl;
          registeredMember.nationality = registeredMember.nationality || nationality;
          registeredMember.residenceCountry = registeredMember.residenceCountry || residenceCountry;
          registeredMember.country = registeredMember.residenceCountry;
          registeredMember.termsAccepted = true;
          registeredMember.termsAcceptedAt = termsAcceptedAt;
        } else {
          throw new Error(result.message || 'Registration failed on backend server.');
        }
      } else {
        // Fallback to DemoStore when Web App URL is not set
        await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate net delay
        registeredMember = DemoStore.saveMember({
          registrationType,
          fullName,
          photoUrl: uploadedPhotoBase64,
          dob,
          gender,
          nationality,
          residenceCountry,
          phone,
          whatsapp,
          email,
          address,
          district,
          state,
          pinCode,
          bloodGroup,
          membershipType,
          joiningDate,
          termsAccepted: true,
          termsAcceptedAt: termsAcceptedAt
        });
      }

      // Store generated member data in sessionStorage and redirect to success page
      sessionStorage.setItem('currentMember', JSON.stringify(registeredMember));
      showToast('Registration successful!', 'success');
      
      setTimeout(() => {
        window.location.href = `success.html?id=${encodeURIComponent(registeredMember.membershipId)}`;
      }, 500);

    } catch (err) {
      console.error('Registration Error:', err);
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        showToast('Connection error! Please update Apps Script deployment settings to "Who has access: Anyone".', 'danger');
      } else {
        showToast(`Error: ${err.message}`, 'danger');
      }
      submitBtn.disabled = false;
    } finally {
      hideLoading();
    }
  });
}

function markInvalid(id) {
  const input = document.getElementById(id);
  if (input) input.classList.add('is-invalid');
}
