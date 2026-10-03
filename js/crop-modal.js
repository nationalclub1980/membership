/**
 * PASSPORT-SIZE PHOTO CROP & CUSTOMIZATION EDITOR MODAL (js/crop-modal.js)
 * Aspect Ratio: 3:4 Portrait Passport Format
 */

let activeCropper = null;
let currentRawImageSrc = '';

function injectCropModalHTML() {
  if (document.getElementById('passportCropModal')) return;

  const modalHtml = `
    <div class="crop-modal-backdrop" id="passportCropModal">
      <div class="crop-modal-card">
        
        <!-- Modal Header -->
        <div class="crop-modal-header">
          <div>
            <h3 class="crop-modal-title"><span>📷</span> Customize Your Membership Photo</h3>
            <p class="crop-modal-subtitle">Position your face inside the guide (3:4 Passport Ratio)</p>
          </div>
          <button type="button" class="btn-close" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--slate-500);" onclick="closePhotoCropModal()">✕</button>
        </div>

        <!-- Modal Body & Stage -->
        <div class="crop-modal-body">
          <div class="crop-stage-wrapper">
            <img id="cropperStageImage" src="" alt="Photo to crop">
            
            <!-- Passport Face Alignment Guide Overlay (Purely visual overlay) -->
            <div class="crop-face-guide-overlay" title="Position head/face inside the dashed guide line">
              <svg class="crop-face-guide-svg" viewBox="0 0 100 133" preserveAspectRatio="none">
                <!-- Head Oval Guide -->
                <ellipse cx="50" cy="48" rx="22" ry="28" />
                <!-- Shoulder Arc Guide -->
                <path d="M 12,125 C 20,95 80,95 88,125" />
                <!-- Eye Level Line -->
                <line x1="32" y1="44" x2="68" y2="44" stroke-opacity="0.6" stroke-dasharray="2 2" />
              </svg>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="crop-controls-panel">
            
            <!-- Zoom Controls -->
            <div class="crop-control-group">
              <span class="crop-slider-label">Zoom:</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="adjustCropperZoom(-0.1)" title="Zoom Out">−</button>
              <input type="range" id="cropperZoomSlider" class="crop-zoom-slider" min="0.5" max="3.0" step="0.05" value="1.0">
              <button type="button" class="btn btn-secondary btn-sm" onclick="adjustCropperZoom(0.1)" title="Zoom In">+</button>
            </div>

            <!-- Rotate & Reset Controls -->
            <div class="crop-control-group">
              <button type="button" class="btn btn-secondary btn-sm" onclick="rotateCropper(-90)" title="Rotate Left">↶ Rotate Left</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="rotateCropper(90)" title="Rotate Right">↷ Rotate Right</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="resetCropper()" title="Reset Crop">🔄 Reset</button>
            </div>

          </div>
        </div>

        <!-- Modal Footer -->
        <div class="crop-modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closePhotoCropModal()">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmPhotoCropBtn">✨ Confirm Photo</button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Open Photo Crop Modal for editing
 */
function openPhotoCropModal(imageSrc, onConfirm, onCancel) {
  injectCropModalHTML();

  currentRawImageSrc = imageSrc;
  const modal = document.getElementById('passportCropModal');
  const stageImg = document.getElementById('cropperStageImage');
  const confirmBtn = document.getElementById('confirmPhotoCropBtn');
  const zoomSlider = document.getElementById('cropperZoomSlider');

  if (!modal || !stageImg || !confirmBtn) return;

  // Clean up previous cropper instance
  if (activeCropper) {
    activeCropper.destroy();
    activeCropper = null;
  }

  stageImg.src = imageSrc;
  modal.classList.add('active');

  // Initialize Cropper.js when image is ready
  let retryCount = 0;
  const initCropper = () => {
    if (typeof Cropper === 'undefined') {
      retryCount++;
      if (retryCount > 25) {
        if (typeof showToast === 'function') {
          showToast('Photo editor could not be loaded. Please refresh the page and try again.', 'danger');
        } else {
          alert('Photo editor could not be loaded. Please refresh the page and try again.');
        }
        closePhotoCropModal();
        return;
      }
      setTimeout(initCropper, 100);
      return;
    }

    activeCropper = new Cropper(stageImg, {
      aspectRatio: 3 / 4, // 3:4 Passport Portrait Ratio
      viewMode: 1,
      autoCropArea: 0.9,
      responsive: true,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      zoom: function(e) {
        if (zoomSlider) {
          const ratio = Math.min(3.0, Math.max(0.5, e.detail.ratio));
          zoomSlider.value = ratio.toFixed(2);
        }
      }
    });

    if (zoomSlider) {
      zoomSlider.value = 1.0;
      zoomSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        if (activeCropper) {
          activeCropper.zoomTo(val);
        }
      };
    }
  };

  setTimeout(initCropper, 150);

  // Confirm Handler
  confirmBtn.onclick = () => {
    if (!activeCropper) return;

    // Generate high-resolution 600x800 px 3:4 passport cropped canvas
    const canvas = activeCropper.getCroppedCanvas({
      width: 600,
      height: 800,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    if (!canvas) {
      if (typeof showToast === 'function') {
        showToast('Photo processing failed. Please adjust the crop area and try again.', 'danger');
      } else {
        alert('Photo processing failed. Please adjust the crop area and try again.');
      }
      return;
    }

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);

    canvas.toBlob((blob) => {
      const croppedFile = blob ? new File([blob], "membership-passport-photo.jpg", { type: "image/jpeg" }) : null;
      closePhotoCropModal();
      if (typeof onConfirm === 'function') {
        onConfirm(croppedBase64, croppedFile, blob);
      }
    }, 'image/jpeg', 0.9);
  };

  // Cancel Handler hook
  modal.dataset.cancelHook = onCancel ? 'has_cancel' : '';
}

/**
 * Close Photo Crop Modal
 */
function closePhotoCropModal() {
  const modal = document.getElementById('passportCropModal');
  if (modal) {
    modal.classList.remove('active');
  }
  if (activeCropper) {
    activeCropper.destroy();
    activeCropper = null;
  }
}

/**
 * Adjust Cropper Zoom programmatically
 */
function adjustCropperZoom(delta) {
  if (activeCropper) {
    activeCropper.zoom(delta);
  }
}

/**
 * Rotate Cropper programmatically
 */
function rotateCropper(degree) {
  if (activeCropper) {
    activeCropper.rotate(degree);
  }
}

/**
 * Reset Cropper to default framing
 */
function resetCropper() {
  if (activeCropper) {
    activeCropper.reset();
  }
}
