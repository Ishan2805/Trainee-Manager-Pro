/**
 * TRAINEE MANAGER PRO - FINAL PRODUCTION BUILD (v2.6)
 * Features:
 * 1. Clean Blank CSV Template (30 Cols)
 * 2. Fixed Restore & Download Logic
 * 3. Smart Import & Android Scoped Storage
 */

// ==========================================
// PART 1: DATABASE LAYER
// ==========================================
const DB = (function () {
  const DB_NAME = "TraineeManagerDB";
  const DB_VERSION = 1;
  const STORE_NAME = "trainees";
  let dbInstance = null;

  const initDB = () => {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "trainee_id",
          });
          store.createIndex("batch", "batch_no", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }
      };
      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        dbInstance.onclose = () => {
          dbInstance = null;
        };
        resolve(dbInstance);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  };

  const performTransaction = async (mode, callback) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = callback(store);
      request.onsuccess = () => resolve(request.result || true);
      request.onerror = () => reject(request.error);
    });
  };

  return {
    saveTrainee: (trainee) =>
      performTransaction("readwrite", (store) => store.put(trainee)),
    getAllTrainees: () =>
      performTransaction("readonly", (store) => store.getAll()),
    deleteTrainee: (id) =>
      performTransaction("readwrite", (store) => store.delete(id)),
    getTraineeById: (id) =>
      performTransaction("readonly", (store) => store.get(id)),
    clearAllTrainees: () =>
      performTransaction("readwrite", (store) => store.clear()),
  };
})();

// ==========================================
// PART 2: STORAGE INFO
// ==========================================
async function updateStorageInfo() {
  const container = document.getElementById("storage-stats-area");
  if (!container) return;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      const usedMB = (usage / 1024 / 1024).toFixed(2);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      const percent = ((usage / quota) * 100).toFixed(1);

      let isPersisted = false;
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }

      container.innerHTML = `
                <div class="storage-card">
                    <h4>Storage Status</h4>
                    <div class="storage-row"><span>Used:</span><strong>${usedMB} MB</strong></div>
                    <div class="storage-row"><span>Total Available:</span><strong>${quotaMB} MB</strong></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.max(
                      percent,
                      5
                    )}%"></div></div>
                    <div style="text-align: right; font-size: 11px; margin-bottom: 10px;">${percent}% Used</div>
                    <div class="storage-row">
                        <span>Protection:</span>
                        <strong style="color: ${
                          isPersisted ? "var(--success)" : "var(--warning)"
                        }">${isPersisted ? "Secure 🔒" : "Standard ⚠️"}</strong>
                    </div>
                    ${
                      !isPersisted
                        ? `<button onclick="triggerPersistence()" class="btn-mini">Enable Protection</button>`
                        : ""
                    }
                </div>
            `;
    } catch (err) {
      container.innerHTML = `<p style="color:red; font-size:12px;">Error: ${err.message}</p>`;
    }
  } else {
    container.innerHTML = `<p style="font-size:12px;">Storage API not supported.</p>`;
  }
}

window.triggerPersistence = async function () {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    if (granted) {
      window.showAlert("Success", "Data protected.", "success");
      updateStorageInfo();
    } else {
      window.showAlert("Denied", "Permission denied.", "error");
    }
  }
};

// ==========================================
// PART 3: MAIN APP LOGIC
// ==========================================

let currentTraineeData = [];
let searchTimeout = null;
let currentExportData = [];
let currentReportType = "";

const VIEW_TITLES = {
  list: "Trainee List",
  reports: "Batch Reports",
  data: "Data Management",
  about: "About Project",
};

window.showView = async function (viewId) {
  const contentArea = document.getElementById("content-area");
  const template = document.getElementById(`view-${viewId}`);
  document.getElementById("view-title").innerText =
    VIEW_TITLES[viewId] || "Trainee Manager";
  contentArea.innerHTML = "";
  if (template) contentArea.appendChild(template.content.cloneNode(true));

  if (viewId === "list") await loadTraineeList();
  if (viewId === "reports") await populateReportBatchDropdown();
  if (viewId === "about") await updateStorageInfo();
};

async function loadTraineeList() {
  currentTraineeData = await DB.getAllTrainees();
  renderList(currentTraineeData);
}

function renderList(data) {
  const container = document.getElementById("list-container");
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state" style="margin-top:50px; text-align:center; color:#94a3b8;">No records found.</div>`;
    return;
  }

  container.innerHTML = data
    .map((t) => {
      const get = (k) =>
        t[k] || t[k.toLowerCase()] || t[k.replace(" ", "_")] || "";
      const name = get("Trainee Name") || "Unknown";
      const surname = get("Surname");
      const batch = t["Batch_No"] || t["Batch No"] || t["batch_no"] || "-";
      const course = get("Course Name") || "-";
      const status = t["Status"] || "Active";
      const id = t["Trainee Id"] || t.trainee_id;
      const photo = t.photo || "";
      const avatarStyle = photo
        ? `background-image: url(${photo}); background-size: cover; color: transparent;`
        : "";

      return `
        <div class="trainee-card" onclick="viewTraineeDetails('${id}')">
            <div class="avatar" style="${avatarStyle}">${name.charAt(0)}</div>
            <div class="info">
                <div class="name">${name} ${surname}</div>
                <div class="sub">${course} • ${batch}</div>
            </div>
            <div class="status-badge ${status.toLowerCase()}">${status}</div>
            <i class="ri-arrow-right-s-line" style="color: #cbd5e1;"></i>
        </div>`;
    })
    .join("");
}

window.handleSearch = function (input) {
  const clearBtn = document.getElementById("clearSearchBtn");
  const term = input.value.toLowerCase();
  if (term.length > 0) clearBtn.classList.add("visible");
  else clearBtn.classList.remove("visible");

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const filtered = currentTraineeData.filter((t) => {
      const name = (t["Trainee Name"] || "").toLowerCase();
      const id = (t["Trainee Id"] || "").toLowerCase();
      const batch = (t["Batch_No"] || "").toLowerCase();
      return name.includes(term) || id.includes(term) || batch.includes(term);
    });
    renderList(filtered);
  }, 150);
};

window.clearSearch = function () {
  const input = document.getElementById("traineeSearch");
  input.value = "";
  window.handleSearch(input);
  input.focus();
};

window.viewTraineeDetails = function (id) {
  const t = currentTraineeData.find(
    (tr) => tr["Trainee Id"] == id || tr.trainee_id == id
  );
  if (!t) return;

  const drawer = document.getElementById("detailDrawer");
  const content = document.getElementById("drawer-dynamic-content");
  content.classList.remove("expanded");

  const get = (k) => t[k] || t[k.toLowerCase()] || t[k.replace(" ", "_")] || "";

  const name = get("Trainee Name");
  const surname = get("Surname");
  const status = get("Status") || "Active";
  const uniqueId = get("Trainee Id");
  const photo = t.photo || "";
  const contact = get("Contact_No");
  const email = get("Email");
  const fatherContact = get("Father/Relative_Contact_No");
  const avatarStyle = photo
    ? `background-image: url(${photo}); background-size: cover; color: transparent;`
    : "";

  content.innerHTML = `
        <button onclick="closeDrawer()" class="icon-close-btn"><i class="ri-close-line"></i></button>
        <div class="drawer-header-profile">
            <div class="large-avatar" style="${avatarStyle}">${name.charAt(
    0
  )}</div>
            <h2>${name} ${surname}</h2>
            <span class="status-badge ${status.toLowerCase()}">${status}</span>
            <div class="action-bar">
                <a href="tel:${contact}" class="action-pill"><div class="action-icon bg-call"><i class="ri-phone-fill"></i></div><span>Call</span></a>
                <a href="mailto:${email}" class="action-pill"><div class="action-icon bg-email"><i class="ri-mail-send-fill"></i></div><span>Email</span></a>
                <a href="tel:${fatherContact}" class="action-pill"><div class="action-icon bg-father"><i class="ri-parent-fill"></i></div><span>Father</span></a>
                <div onclick="editTrainee('${uniqueId}')" class="action-pill"><div class="action-icon bg-edit"><i class="ri-pencil-fill"></i></div><span>Edit</span></div>
                <div onclick="deleteTrainee('${uniqueId}')" class="action-pill"><div class="action-icon bg-delete"><i class="ri-delete-bin-line"></i></div><span>Delete</span></div>
            </div>
        </div>
        <div class="drawer-body-scroll" id="scrollArea">
            <div class="drawer-section-title">Official Info</div>
            ${generateDetailRow("Enrollment No", uniqueId)}
            ${generateDetailRow("Batch", get("Batch_No"))}
            ${generateDetailRow("Course", get("Course Name"))}
            ${generateDetailRow("Status Note", get("Status_Note"))}
            <div class="drawer-section-title">Personal Details</div>
            ${generateDetailRow("Father Name", get("Father Name"))}
            ${generateDetailRow("Gender", get("Gender"))}
            ${generateDetailRow("Birthdate", get("Birthdate"))}
            ${generateDetailRow("Caste", get("Caste"))}
            ${generateDetailRow("Category", get("Category"))}
            <div class="drawer-section-title">Contact & Address</div>
            ${generateDetailRow("Self Mobile", contact)}
            ${generateDetailRow("Parent Mobile", fatherContact)}
            ${generateDetailRow("Email", email)}
            ${generateDetailRow("Address", get("Village/Street"))}
            ${generateDetailRow("Taluka", get("Taluka"))}
            ${generateDetailRow("District", get("District"))}
            ${generateDetailRow("State", get("State/UT"))}
            ${generateDetailRow("Pin Code", get("Pin"))}
            <div class="drawer-section-title">Documents</div>
            ${generateDetailRow("Qualification", get("Highest_Qualification"))}
            ${generateDetailRow("Aadhar No", get("Adhar_No"))}
            ${generateDetailRow("Voter ID", get("Voter_Id"))}
            ${generateDetailRow("Ration Card", get("Ration_card_no"))}
            <div class="drawer-section-title">Scholarship</div>
            ${generateDetailRow("Received", get("Scholarship_recieved"))}
            ${generateDetailRow("Scheme", get("Scholarship_scheme"))}
            ${
              get("Other_details_if_any")
                ? `<div class="drawer-section-title">Other</div><div style="font-size:13px; color:#334155; margin-top:5px;">${get(
                    "Other_details_if_any"
                  )}</div>`
                : ""
            }
            <div style="height: 40px;"></div>
        </div>`;

  const scrollArea = document.getElementById("scrollArea");
  if (scrollArea) {
    scrollArea.addEventListener("scroll", function () {
      if (this.scrollTop > 10 && !content.classList.contains("expanded")) {
        content.classList.add("expanded");
      }
    });
  }
  drawer.classList.remove("hidden");
  setTimeout(() => drawer.classList.add("open"), 10);
};

window.openAddModal = function (isEditMode = false) {
  const modal = document.getElementById("addModal");
  const form = document.getElementById("traineeForm");
  const idInput = form.elements["Trainee Id"];
  modal.classList.remove("hidden");
  if (!isEditMode) {
    form.reset();
    document.querySelector("#addModal h3").innerText = "Add New Trainee";
    if (idInput) {
      idInput.readOnly = false;
      idInput.style.backgroundColor = "white";
    }
    resetPhotoPreview();
  }
};

window.editTrainee = function (id) {
  window.closeDrawer();
  const t = currentTraineeData.find(
    (tr) => tr["Trainee Id"] == id || tr.trainee_id == id
  );
  if (!t) return;
  const form = document.getElementById("traineeForm");
  form.reset();
  Object.keys(t).forEach((key) => {
    const input = form.elements[key];
    if (input) input.value = t[key] || "";
  });
  if (t.photo) {
    setPhotoPreview(t.photo);
    document.getElementById("photoBase64").value = t.photo;
  } else {
    resetPhotoPreview();
  }
  document.querySelector("#addModal h3").innerText = "Edit Trainee";
  const idInput = form.elements["Trainee Id"];
  if (idInput) {
    idInput.value = t["Trainee Id"] || t.trainee_id;
    idInput.readOnly = true;
    idInput.style.backgroundColor = "#f1f5f9";
  }
  document.getElementById("addModal").classList.remove("hidden");
};

window.deleteTrainee = async function (id) {
  window.showConfirm(
    "Delete Trainee?",
    "Are you sure? This cannot be undone.",
    async () => {
      try {
        await DB.deleteTrainee(id);
        window.closeDrawer();
        await loadTraineeList();
        window.showAlert("Deleted", "Record removed.", "success");
      } catch (error) {
        window.showAlert("Error", error, "error");
      }
    }
  );
};

document.addEventListener("submit", async (e) => {
  if (e.target.id === "traineeForm") {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const id = data["Trainee Id"];
    const existing = currentTraineeData.find((t) => t["Trainee Id"] == id);
    const finalData = existing
      ? { ...existing, ...data }
      : { ...data, Status: "Active" };
    finalData["Trainee Id"] = id;
    finalData.trainee_id = id;
    await DB.saveTrainee(finalData);
    window.closeAddModal();
    await loadTraineeList();
    window.showAlert("Success", "Saved successfully!", "success");
  }
});

// ==========================================
// REPORTS (Full 30-Column)
// ==========================================
async function populateReportBatchDropdown() {
  const trainees = await DB.getAllTrainees();
  const batches = [
    ...new Set(
      trainees
        .map(
          (t) => t["Batch_No"] || t["Batch No"] || t["batch_no"] || t["batch"]
        )
        .filter((b) => b)
    ),
  ];
  const select = document.getElementById("reportBatchSelect");
  if (select)
    select.innerHTML =
      '<option value="">-- Select Batch --</option>' +
      batches
        .sort()
        .map((b) => `<option value="${b}">${b}</option>`)
        .join("");
}

window.generateReport = async function (type) {
  const batch = document.getElementById("reportBatchSelect").value;
  const allData = await DB.getAllTrainees();
  const container = document.getElementById("reportOutput");
  const exportBtns = document.getElementById("exportActions");

  const val = (obj, pKey, fKey) => {
    if (obj[pKey]) return obj[pKey];
    if (fKey && obj[fKey]) return obj[fKey];
    const lower = pKey.toLowerCase();
    const found = Object.keys(obj).find((k) => k.toLowerCase() === lower);
    return found ? obj[found] : "";
  };

  const statusOf = (t) => t["Status"] || t.status || "Active";
  const getBatch = (t) =>
    t["Batch_No"] || t["Batch No"] || t["batch_no"] || "-";
  const matchBatch = (t) => !batch || getBatch(t) === batch;

  let html = "";
  let title = "";
  const batchTitle = batch || "All Batches";
  currentExportData = [];
  currentReportType = type;

  // 1. ON-ROLL LIST
  if (type === "list") {
    title = `On-Roll List (${batchTitle})`;
    const rawRows = allData.filter(
      (t) => matchBatch(t) && statusOf(t) === "Active"
    );
    if (rawRows.length) {
      const cols = [
        { head: "Enrollment No", key: "Trainee Id", alt: "trainee_id" },
        { head: "Name", key: "Trainee Name", alt: "trainee_name" },
        { head: "Surname", key: "Surname", alt: "surname" },
        { head: "Father Name", key: "Father Name", alt: "father_name" },
        { head: "Gender", key: "Gender", alt: "gender" },
        { head: "Birthdate", key: "Birthdate", alt: "birthdate" },
        { head: "Mobile", key: "Contact_No", alt: "contact_no" },
        {
          head: "Parent Mobile",
          key: "Father/Relative_Contact_No",
          alt: "father_contact_no",
        },
        { head: "Email", key: "Email", alt: "email" },
        { head: "Caste", key: "Caste", alt: "caste" },
        { head: "Category", key: "Category", alt: "category" },
        { head: "Batch", key: "Batch_No", alt: "batch_no" },
        { head: "Course", key: "Course Name", alt: "course_name" },
        { head: "Address", key: "Village/Street", alt: "address" },
        { head: "Taluka", key: "Taluka", alt: "taluka" },
        { head: "District", key: "District", alt: "district" },
        { head: "State", key: "State/UT", alt: "state" },
        { head: "Pin", key: "Pin", alt: "pin" },
        { head: "Nationality", key: "Nationality", alt: "nationality" },
        {
          head: "Qualification",
          key: "Highest_Qualification",
          alt: "qualification",
        },
        { head: "Aadhar No", key: "Adhar_No", alt: "adhar_no" },
        { head: "Voter ID", key: "Voter_Id", alt: "voter_id" },
        { head: "Ration Card", key: "Ration_card_no", alt: "ration_card_no" },
        { head: "Card Type", key: "Ration_Card_type", alt: "ration_card_type" },
        {
          head: "Scholarship",
          key: "Scholarship_recieved",
          alt: "scholarship_recieved",
        },
        {
          head: "Scheme",
          key: "Scholarship_scheme",
          alt: "scholarship_scheme",
        },
        {
          head: "App No",
          key: "Scholarship_App_No",
          alt: "scholarship_app_no",
        },
        { head: "Status", key: "Status", alt: "status" },
        { head: "Note", key: "Status_Note", alt: "status_note" },
        { head: "Other", key: "Other_details_if_any", alt: "other" },
      ];
      html = buildTable(rawRows, cols, val);
      currentExportData = rawRows.map((r) => {
        let d = {};
        cols.forEach((c) => (d[c.head] = val(r, c.key, c.alt)));
        return d;
      });
    }
  } else if (type === "termination") {
    title = `Termination List (${batchTitle})`;
    const rawRows = allData.filter(
      (t) => matchBatch(t) && statusOf(t) !== "Active"
    );
    const cols = [
      { head: "ID", key: "Trainee Id" },
      { head: "Name", key: "Trainee Name" },
      { head: "Batch", key: "Batch_No" },
      { head: "Status", key: "Status" },
      { head: "Reason", key: "Status_Note" },
    ];
    if (rawRows.length) {
      html = buildTable(rawRows, cols, val);
      currentExportData = rawRows.map((r) => {
        let d = {};
        cols.forEach((c) => (d[c.head] = val(r, c.key)));
        return d;
      });
    }
  } else if (type === "scholarship") {
    title = `Scholarship List (${batchTitle})`;
    const rawRows = allData.filter(
      (t) => matchBatch(t) && val(t, "Scholarship_recieved") === "Yes"
    );
    const cols = [
      { head: "ID", key: "Trainee Id" },
      { head: "Name", key: "Trainee Name" },
      { head: "Batch", key: "Batch_No" },
      { head: "Scheme", key: "Scholarship_scheme" },
    ];
    if (rawRows.length) {
      html = buildTable(rawRows, cols, val);
      currentExportData = rawRows.map((r) => {
        let d = {};
        cols.forEach((c) => (d[c.head] = val(r, c.key)));
        return d;
      });
    }
  } else if (type === "counts") {
    title = `Statistics Matrix (${batchTitle})`;
    const active = allData.filter(
      (t) => matchBatch(t) && statusOf(t) === "Active"
    );
    const castes = ["General", "SEBC", "SC", "ST", "EWS"];
    const matrix = { Male: {}, Female: {}, Total: {} };
    ["Male", "Female", "Total"].forEach((g) => {
      castes.forEach((c) => (matrix[g][c] = 0));
      matrix[g]["Total"] = 0;
      matrix[g]["Divyang"] = 0;
    });

    const normG = (r) =>
      (val(r, "Gender") || "Male").toString().toLowerCase() === "female"
        ? "Female"
        : "Male";
    const normC = (r) => {
      const c = (val(r, "Caste") || "General").toLowerCase();
      if (c == "sc") return "SC";
      if (c == "st") return "ST";
      if (c.includes("sebc") || c.includes("obc")) return "SEBC";
      if (c == "ews") return "EWS";
      return "General";
    };

    active.forEach((t) => {
      const g = normG(t);
      const c = normC(t);
      const div = (val(t, "Category") || "").toLowerCase().includes("divyang");
      if (matrix[g]) {
        matrix[g][c]++;
        matrix["Total"][c]++;
        matrix[g]["Total"]++;
        matrix["Total"]["Total"]++;
        if (div) {
          matrix[g]["Divyang"]++;
          matrix["Total"]["Divyang"]++;
        }
      }
    });

    html = `<div style="overflow-x:auto;"><table class="report-table"><thead><tr><th>Category</th>${castes
      .map((c) => `<th>${c}</th>`)
      .join("")}<th>TOTAL</th><th>Divyang</th></tr></thead><tbody>
        ${["Male", "Female"]
          .map(
            (g) =>
              `<tr><td>${g}</td>${castes
                .map((c) => `<td>${matrix[g][c]}</td>`)
                .join("")}<td>${matrix[g]["Total"]}</td><td>${
                matrix[g]["Divyang"]
              }</td></tr>`
          )
          .join("")}
        <tr style="background:#f0f9ff;font-weight:bold;"><td>TOTAL</td>${castes
          .map((c) => `<td>${matrix["Total"][c]}</td>`)
          .join("")}<td>${matrix["Total"]["Total"]}</td><td>${
      matrix["Total"]["Divyang"]
    }</td></tr></tbody></table></div>`;
    currentExportData = [
      { Category: "Male", ...matrix.Male },
      { Category: "Female", ...matrix.Female },
      { Category: "TOTAL", ...matrix.Total },
    ];
  }

  container.innerHTML = `<div class="report-header"><span class="report-title">${title}</span><span class="report-meta">${new Date().toLocaleDateString()}</span></div><div class="table-responsive">${
    html || '<p style="text-align:center;">No records found.</p>'
  }</div>`;
  container.classList.remove("hidden");
  exportBtns.classList.remove("hidden");
};

function buildTable(rows, columns, valFunc) {
  let th = columns.map((c) => `<th>${c.head}</th>`).join("");
  let tr = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${valFunc(r, c.key, c.alt)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<table class="report-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

// ==========================================
// EXPORT FUNCTIONS (Fixed: Android Safe)
// ==========================================

// Helper for download
function triggerDownload(dataUri, fileName) {
  if (window.Android && window.Android.processBlob) {
    const mime = dataUri.split(";")[0].split(":")[1];
    window.Android.processBlob(dataUri, mime);
  } else {
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.exportToCSV = function () {
  if (!currentExportData.length)
    return window.showAlert("Info", "No data.", "info");
  const csv = Papa.unparse(currentExportData);
  const base64 = btoa(unescape(encodeURIComponent(csv)));
  const dataUri = "data:text/csv;base64," + base64;
  triggerDownload(
    dataUri,
    `Report_${currentReportType}_${new Date().toISOString().slice(0, 10)}.csv`
  );
};

window.exportToPDF = function () {
  if (!currentExportData.length)
    return window.showAlert("Info", "No data.", "info");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");
  const headers = Object.keys(currentExportData[0]);
  const body = currentExportData.map((row) => Object.values(row));

  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text(`${currentReportType.toUpperCase()} REPORT`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 20);

  doc.autoTable({
    startY: 25,
    head: [headers],
    body: body,
    theme: "grid",
    styles: { fontSize: 5, cellPadding: 1, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
  });

  const dataUri = doc.output("datauristring");
  triggerDownload(
    dataUri,
    `Report_${new Date().toISOString().slice(0, 10)}.pdf`
  );
};

// ==========================================
// IMPORT & BACKUP
// ==========================================
const HEADER_MAP = {
  id: "Trainee Id",
  enrollment: "Trainee Id",
  "enrollment no": "Trainee Id",
  name: "Trainee Name",
  "student name": "Trainee Name",
  father: "Father Name",
  "father name": "Father Name",
  batch: "Batch_No",
  "batch no": "Batch_No",
  batch_no: "Batch_No",
  mobile: "Contact_No",
  "mobile no": "Contact_No",
  contact: "Contact_No",
  phone: "Contact_No",
  dob: "Birthdate",
  "date of birth": "Birthdate",
  aadhar: "Adhar_No",
  adhar: "Adhar_No",
  address: "Village/Street",
};

function normalizeCSVData(data) {
  return data.map((row) => {
    const newRow = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, " ");
      if (HEADER_MAP[cleanKey]) newRow[HEADER_MAP[cleanKey]] = row[key].trim();
      else {
        const titleKey = key.replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        newRow[titleKey] = row[key].trim();
      }
    });
    return newRow;
  });
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const regex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/;
  if (!regex.test(dateStr)) return false;
  const [day, month, year] = dateStr.split("-");
  return `${year}-${month}-${day}`;
}

window.handleCSVSelect = function (input) {
  if (input.files && input.files[0]) processCSVImport(input.files[0]);
  input.value = "";
};

function processCSVImport(file) {
  if (!file) return window.showAlert("No File", "Select a valid CSV.", "error");
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const data = normalizeCSVData(results.data);
      const errors = [];
      const validRows = [];
      const existingTrainees = await DB.getAllTrainees();
      const existingIds = new Set(
        existingTrainees.map((t) => t["Trainee Id"] || t.trainee_id)
      );

      data.forEach((row, index) => {
        const rowNum = index + 2;
        const id = row["Trainee Id"];
        if (!id) {
          errors.push(`Row ${rowNum}: Missing 'Trainee Id'`);
          return;
        }
        if (existingIds.has(id)) {
          errors.push(`Row ${rowNum}: ID '${id}' exists.`);
          return;
        }
        if (validRows.find((r) => r["Trainee Id"] === id)) {
          errors.push(`Row ${rowNum}: Duplicate ID '${id}'.`);
          return;
        }
        if (!row["Trainee Name"]) {
          errors.push(`Row ${rowNum}: Missing Name.`);
          return;
        }
        if (!row["Batch_No"]) {
          errors.push(`Row ${rowNum}: Missing Batch.`);
          return;
        }

        let dob = "";
        if (row["Birthdate"]) {
          const parsed = parseDate(row["Birthdate"]);
          if (parsed === false) {
            errors.push(`Row ${rowNum}: Invalid Date '${row["Birthdate"]}'.`);
            return;
          }
          dob = parsed;
        }

        validRows.push({
          ...row,
          trainee_id: id,
          "Trainee Id": id,
          Batch_No: row["Batch_No"],
          Birthdate: dob,
          Status: "Active",
        });
      });

      if (errors.length > 0)
        return window.showAlert(
          "Import Issues",
          errors.slice(0, 5).join("<br>") + "<br>...",
          "error"
        );
      if (validRows.length === 0)
        return window.showAlert("Empty", "No valid data.", "info");

      try {
        await Promise.all(validRows.map((row) => DB.saveTrainee(row)));
        window.showAlert(
          "Success",
          `Imported ${validRows.length} trainees!`,
          "success"
        );
        setTimeout(() => showView("list"), 1500);
      } catch (err) {
        window.showAlert("Error", err.message, "error");
      }
    },
  });
}

// FIXED: Uses 'triggerDownload' to safely pass JSON to Android
window.performBackup = async function () {
  try {
    const rawData = await DB.getAllTrainees();
    if (!rawData.length)
      return window.showAlert("No Data", "DB is empty.", "info");

    // 1. Clean & Normalize Data (Same as before)
    const cleanData = rawData.map((item) => {
      const clean = { ...item };
      if (!clean["Batch_No"]) {
        const bKey = Object.keys(item).find(
          (k) => k.toLowerCase().replace(/[^a-z]/g, "") === "batchno"
        );
        clean["Batch_No"] = bKey
          ? item[bKey]
          : item["Batch No"] || item["batch"] || "-";
      }
      if (!clean["Trainee Id"]) {
        const idKey = Object.keys(item).find(
          (k) =>
            k.toLowerCase().includes("id") || k.toLowerCase().includes("enroll")
        );
        clean["Trainee Id"] = idKey ? item[idKey] : item.trainee_id;
      }
      clean.trainee_id = clean["Trainee Id"];
      return clean;
    });

    // 2. Prepare JSON String
    const jsonStr = JSON.stringify(cleanData, null, 2);

    // 3. Encode to Base64 (Android Safe)
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const dataUri = "data:application/json;base64," + base64;

    // 4. Generate Filename (Safe Date Format)
    const date = new Date().toISOString().split("T")[0]; // "2025-01-10"
    const fileName = `TraineeBackup_${date}.json`;

    // 5. Send to Android Bridge
    triggerDownload(dataUri, fileName);
  } catch (e) {
    console.error(e);
    window.showAlert("Error", "Backup failed: " + e.message, "error");
  }
};

// FIXED: Clean Data on Restore (Safe File Ref)
window.previewRestoreFile = function (input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    window.showConfirm("Restore?", "This wipes current data.", () =>
      processRestore(file)
    );
  }
  input.value = "";
};

async function processRestore(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const rawData = JSON.parse(e.target.result);
      await DB.clearAllTrainees();
      const cleanData = rawData.map((item) => {
        const clean = { ...item };
        if (!clean["Batch_No"]) {
          const bKey = Object.keys(item).find(
            (k) => k.toLowerCase().replace(/[^a-z]/g, "") === "batchno"
          );
          clean["Batch_No"] = bKey
            ? item[bKey]
            : item["Batch No"] || item["batch"] || "-";
        }
        if (!clean["Trainee Id"]) {
          const idKey = Object.keys(item).find(
            (k) =>
              k.toLowerCase().includes("id") ||
              k.toLowerCase().includes("enroll")
          );
          clean["Trainee Id"] = idKey ? item[idKey] : item.trainee_id;
        }
        clean.trainee_id = clean["Trainee Id"];
        return clean;
      });
      await Promise.all(cleanData.map((t) => DB.saveTrainee(t)));
      window.showAlert(
        "Success",
        `Restored ${cleanData.length} records.`,
        "success"
      );
      if (
        document.getElementById("view-title").innerText === VIEW_TITLES["list"]
      )
        await loadTraineeList();
    } catch (err) {
      window.showAlert("Error", "Invalid Backup", "error");
    }
  };
  reader.readAsText(file);
}

// FIXED: Blank Template with 30 Cols
window.downloadSampleCSV = function () {
  const headers = [
    "Trainee Id",
    "Trainee Name",
    "Surname",
    "Father Name",
    "Gender",
    "Birthdate",
    "Contact_No",
    "Father/Relative_Contact_No",
    "Email",
    "Caste",
    "Category",
    "Batch_No",
    "Course Name",
    "Village/Street",
    "Taluka",
    "District",
    "State/UT",
    "Pin",
    "Nationality",
    "Highest_Qualification",
    "Adhar_No",
    "Voter_Id",
    "Ration_card_no",
    "Ration_Card_type",
    "Scholarship_recieved",
    "Scholarship_scheme",
    "Scholarship_App_No",
    "Status",
    "Status_Note",
    "Other_details_if_any",
  ];
  const csvContent = headers.join(",");
  const base64 = btoa(unescape(encodeURIComponent(csvContent)));
  const dataUri = "data:text/csv;base64," + base64;
  triggerDownload(dataUri, "Trainee_Import_Template.csv");
};

window.handlePhotoSelect = function (input) {
  if (input.files?.[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const max = 300;
        let w = img.width,
          h = img.height;
        if (w > h) {
          h *= max / w;
          w = max;
        } else {
          w *= max / h;
          h = max;
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        document.getElementById("photoBase64").value = base64;
        setPhotoPreview(base64);
      };
    };
    reader.readAsDataURL(input.files[0]);
  }
};

function setPhotoPreview(url) {
  const p = document.getElementById("photoPreview");
  p.style.backgroundImage = `url(${url})`;
  p.innerHTML = "";
}
function resetPhotoPreview() {
  const p = document.getElementById("photoPreview");
  p.style.backgroundImage = "none";
  p.innerHTML =
    '<i class="ri-camera-add-line" style="font-size:32px;color:#94a3b8;"></i>';
  document.getElementById("photoBase64").value = "";
}
function generateDetailRow(label, value) {
  return value
    ? `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`
    : "";
}
window.closeDrawer = () => {
  document.getElementById("detailDrawer").classList.remove("open");
  setTimeout(
    () => document.getElementById("detailDrawer").classList.add("hidden"),
    300
  );
};
window.closeAddModal = () =>
  document.getElementById("addModal").classList.add("hidden");
window.updateFileName = (input) => {
  if (input.files[0])
    document.getElementById("fileNameDisplay").innerText = input.files[0].name;
};

// Alerts
window.showAlert = (t, m, type = "info") => {
  const modal = document.getElementById("customAlert");
  document.getElementById("alertTitle").innerText = t;
  document.getElementById("alertMessage").innerHTML = m;
  const icon = document.getElementById("alertIconBox");
  icon.className =
    "alert-icon-box " +
    (type === "error"
      ? "alert-error"
      : type === "success"
      ? "alert-success"
      : "alert-info");
  icon.innerHTML =
    type === "error"
      ? '<i class="ri-error-warning-line"></i>'
      : type === "success"
      ? '<i class="ri-check-line"></i>'
      : '<i class="ri-information-line"></i>';
  document.getElementById("alertOkBtn").onclick = window.closeCustomAlert;
  document.getElementById("alertOkBtn").innerText = "Okay";
  document.getElementById("alertOkBtn").className = "btn-primary";
  document.getElementById("alertCancelBtn").classList.add("hidden");
  modal.classList.remove("hidden");
};
window.showConfirm = (t, m, cb) => {
  window.showAlert(t, m, "error");
  const ok = document.getElementById("alertOkBtn");
  ok.innerText = "Yes, Proceed";
  ok.className = "btn-primary";
  ok.style.backgroundColor = "var(--danger)";
  ok.onclick = () => {
    cb();
    window.closeCustomAlert();
  };
  document.getElementById("alertCancelBtn").classList.remove("hidden");
};
window.closeCustomAlert = () =>
  document.getElementById("customAlert").classList.add("hidden");

// Init
window.showView = showView;
window.openAddModal = openAddModal;
window.onload = () => showView("list");
