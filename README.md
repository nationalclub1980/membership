# 🪪 Digital Membership Registration & Card System

A complete, modern, mobile-friendly **Membership Registration and Digital Membership Card Web Application** designed to run 100% serverless on **GitHub Pages** with **Google Apps Script** as the backend, **Google Sheets** as the master database, and **Google Drive** for photo and card storage.

---

## ✨ Features

- **🌐 100% Free Hosting**: Hosted on GitHub Pages with zero server costs.
- **📝 Member Registration**: Dynamic, mobile-first registration form with client-side validation and profile photo uploads.
- **🔢 Automatic Sequential Membership ID**: Concurrency-safe ID generation (`ORG-2026-0001`, `ORG-2026-0002`) using Apps Script `LockService`.
- **🪪 Instant Digital Membership Card**: Personalized digital card generated immediately upon successful submission.
- **📥 HD Image Download**: One-click download of high-resolution PNG card images using `html2canvas`.
- **📲 Embedded QR Verification**: Every card includes an embedded QR code linking directly to the public verification page.
- **🔍 Public Verification Page**: Security-compliant verification portal showing non-sensitive credential details only (Hides Phone, Address, Email, DOB).
- **🔒 Protected Admin Dashboard**: Metric cards, live search, status editor (Active/Expired/Suspended), and **1-click Excel (.xlsx) database export**.
- **⚡ Client Demo Fallback**: Works out-of-the-box in LocalStorage Demo mode even before setting up your Google Apps Script!

---

## 📁 Project Structure

```text
membership-app/
│
├── index.html            # Campaign Landing Page
├── register.html         # New Member Registration Form
├── renewal.html          # Renewal Member Registration Form
├── success.html          # Registration Success & Digital Card Display
├── verify.html           # Public Credential Verification Portal
├── admin.html            # Protected Administrator Dashboard
│
├── css/
│   └── style.css         # Modern Design System & Digital Card Styles
│
├── js/
│   ├── config.js         # Organization & Apps Script Web App Configuration
│   ├── main.js           # Navigation, Toasts, Loaders & LocalStorage Demo Store
│   ├── registration.js   # Form validation & submit payload handler
│   ├── membership.js     # Digital card renderer, QR generator & HD download
│   ├── verification.js   # Public verification lookup logic
│   └── admin.js          # Admin dashboard, PIN login, filter & Excel export
│
├── assets/
│   └── logo.svg          # Organization Crest Logo Asset
│
├── Code.gs               # Complete Google Apps Script Backend Code
└── README.md             # Step-by-Step Setup Guide
```

---

## 🚀 Beginner Step-by-Step Setup Guide

Follow these simple steps to deploy your complete backend on Google Sheets & Google Drive, and launch your frontend on GitHub Pages:

### Step 1: Your Master Google Sheet
Your master Google Sheet is configured:
- **Sheet Link**: [Master Membership Database](https://docs.google.com/spreadsheets/d/1yWsBD81iJvH650lF94aTf6QoTcczXQ_cHD0xzBCE674/edit?usp=sharing)
- **Spreadsheet ID**: `1yWsBD81iJvH650lF94aTf6QoTcczXQ_cHD0xzBCE674`

*(Note: `Code.gs` has already been pre-configured with this exact Spreadsheet ID!)*

### Step 2: Google Drive Storage Folders
Your Google Drive storage folders are configured:
- **Member Photos Folder**: [Member Photos Storage](https://drive.google.com/drive/folders/1iGA2UX1PGgXy4xfI8t7kenfqNWBUkv9U?usp=drive_link) (`ID: 1iGA2UX1PGgXy4xfI8t7kenfqNWBUkv9U`)
- **Membership Cards Folder**: [Membership Cards Storage](https://drive.google.com/drive/folders/1p0N2nrz-VnDFtxIsXUTgIh0AB0P53V3z?usp=drive_link) (`ID: 1p0N2nrz-VnDFtxIsXUTgIh0AB0P53V3z`)

*(Note: `Code.gs` has been pre-configured with these exact Drive Folder IDs so photo uploads and card files will save directly into these folders!)*

### Step 3: Set Up Google Apps Script
1. Open your Google Sheet: [Master Membership Database](https://docs.google.com/spreadsheets/d/1yWsBD81iJvH650lF94aTf6QoTcczXQ_cHD0xzBCE674/edit?usp=sharing)
2. In the top menu, click **Extensions** ➔ **Apps Script**.
3. Delete any default code in `Code.gs`.
4. Copy and paste the entire code from the [`Code.gs`](Code.gs) file in this repository.

### Step 4: Deploy Apps Script as a Web App
1. Click the blue **Deploy** button at top right ➔ Select **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and select **Web app**.
3. Fill in deployment settings:
   - **Description**: `Membership Web App Backend v1`
   - **Execute as**: **Me** (*your Google account*)
   - **Who has access**: **Anyone**
4. Click **Deploy**, grant authorization permissions when prompted.
5. Copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 5: Configure Frontend Web Application
1. Open `js/config.js` in your codebase.
2. Paste your copied Web App URL into `WEB_APP_URL`:
   ```javascript
   WEB_APP_URL: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
3. *(Optional)* Customize your organization name, logo path, and membership ID prefix in `js/config.js`.

### Step 6: Publish on GitHub Pages
1. Push your project code to a public GitHub Repository.
2. In your repository settings on GitHub:
   - Go to **Settings** ➔ **Pages**.
   - Under **Build and deployment** ➔ **Source**: Select `Deploy from a branch`.
   - Under **Branch**: Select `main` (or `master`) / `(root)` folder ➔ Click **Save**.
3. GitHub Pages will generate your live public site link (e.g., `https://yourusername.github.io/membership-app/`).

---

## 🧪 Verification & Testing Checklist

Once deployed, run through this verification list:

- [x] **Test New Registration**: Open `register.html`, fill in required fields, upload a profile photo, and click Submit.
- [x] **Check Master Google Sheet**: Verify that a new row appears in your Google Sheet with all columns populated.
- [x] **Verify Google Drive Photo**: Confirm that the uploaded profile photo is saved inside the `Member Photos` Drive folder.
- [x] **Verify Sequential ID Generation**: Register a second member and verify the ID increments sequentially (`ORG-2026-0001`, `ORG-2026-0002`).
- [x] **Verify Digital Membership Card**: Check that the card renders with member photo, logo, QR code, and validity dates (`01 Oct 2026` to `30 Sep 2027`).
- [x] **Test Card Download**: Click "Download Membership Card" and verify that a high-resolution PNG image downloads to your device.
- [x] **Test Public Verification**: Scan the QR code or go to `verify.html?id=ORG-2026-0001`. Ensure only public credential info is displayed and personal phone/address/email/DOB are strictly hidden.
- [x] **Test Admin Dashboard**: Open `admin.html`, enter PIN `admin123`, filter records, update member status, and click **Download Excel (.xlsx)** to export the database spreadsheet.

---

## 🔒 Security & Privacy Practices

- **Zero Server Exposure**: Frontend files contain zero private keys or database access tokens.
- **Backend Enforced Data Filtering**: The public verification endpoint (`action=verifyMember`) returns strictly filtered public parameters, guaranteeing zero leak of phone numbers, home addresses, or emails.
- **Race-Condition Safety**: Sequential ID generation uses Google Apps Script `LockService` to safely prevent duplicate IDs during simultaneous user submissions.

---

## 📄 License
Released under the MIT License. Developed for membership organizations worldwide.
