# 📱 Trainee Manager Pro

<div align="center">

![Version](https://img.shields.io/badge/Version-2.6_Stable-blue?style=for-the-badge&logo=android)
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![Offline](https://img.shields.io/badge/Offline-First-orange?style=for-the-badge&logo=pwa)

**A powerful, offline-first Android application for managing trainee records, generating government-compliant reports, and tracking batch statistics.**

[**⬇️ Download Latest APK**](https://github.com/keshavshiyal/Trainee-Manager-Pro/releases/latest)

</div>

---

## 🚀 Overview

**Trainee Manager Pro** is designed to eliminate paperwork and Excel dependency. It allows instructors and administrators to manage student data directly from their Android devices without needing an active internet connection. 

Built with a robust **Web-to-Native Bridge**, it combines the flexibility of modern web technologies with the power of Android Scoped Storage.

## ✨ Key Features

* **📱 100% Offline Database:** Powered by IndexedDB, your data lives on your device. No server required.
* **📂 Smart CSV Import:** Bulk import trainee data. The smart engine auto-fixes header names (e.g., converts "Mobile No" to "Contact_No").
* **📊 Advanced Reporting:** Generate **On-Roll**, **Termination**, and **Scholarship** reports with a single click.
* **🖨️ PDF & Excel Exports:** Export detailed 30-column reports to PDF (landscape) or CSV for official use.
* **🛡️ Secure Backup & Restore:** Encrypted Base64 backup system ensures you never lose your data. Supports Android 10+ Scoped Storage.
* **🔍 Instant Search:** Filter hundreds of records by Name, Batch, or Enrollment ID instantly.

---

## 📸 App Screenshots

<div align="center">

| **Dashboard & List** | **Batch Reports** | **Data Management** |
|:---:|:---:|:---:|
| <img src="screenshots/Screenshot_20260110-212028.Trainee Manager Pro.png" width="250" /> | <img src="screenshots/Screenshot_20260110-211201.Trainee Manager Pro.png" width="250" /> | <img src="screenshots/Screenshot_20260110-211205.Trainee Manager Pro.png" width="250" /> |

| **Detailed Reporting** | **About & Stats** | **Empty State** |
|:---:|:---:|:---:|
| <img src="screenshots/Screenshot_20260110-212147.Trainee Manager Pro.png" width="250" /> | <img src="screenshots/Screenshot_20260110-211222.Trainee Manager Pro.jpg" width="250" /> | <img src="screenshots/Screenshot_20260110-211142.Trainee Manager Pro.png" width="250" /> |

</div>

---

## 📥 How to Install

1.  **Download:** Click the [Download Button](https://github.com/keshavshiyal/Trainee-Manager-Pro/releases/latest) to get the latest `.apk` file.
2.  **Open:** Locate the file in your downloads folder.
3.  **Permission:** If prompted, allow installation from **"Unknown Sources"** (since this is a private internal tool).
4.  **Launch:** Open the app and start importing your data!

---

## 🛠️ Technical Stack

* **Frontend:** HTML5, CSS3 (Modern Grid/Flex), JavaScript (ES6+)
* **Logic:** Custom JS Framework (No heavy libraries)
* **Storage:** IndexedDB (Client-side) & MediaStore API (Android)
* **Wrapper:** Android WebView with Java Bridge
* **PDF Engine:** jsPDF + AutoTable

---

## 👨‍💻 Developer

**Keshav Shiyal** Developed with ❤️ in India.

[GitHub Profile](https://github.com/keshavshiyal)

---
