document.addEventListener("DOMContentLoaded", () => {
  loadProjectsDropdown();
  loadProjectList();
  loadAlarmsList();
});

// ==========================================
// 1. SISTEM NAVIGASI TAB
// ==========================================
window.switchTab = function(tabName) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

  if (tabName === "home") {
    document.getElementById("tab-home").classList.add("active");
    document.querySelectorAll(".tab-btn")[0].classList.add("active");
  } else if (tabName === "projects") {
    document.getElementById("tab-projects").classList.add("active");
    document.querySelectorAll(".tab-btn")[1].classList.add("active");
    loadProjectList();
  } else if (tabName === "alarms") {
    document.getElementById("tab-alarms").classList.add("active");
    document.querySelectorAll(".tab-btn")[2].classList.add("active");
    loadAlarmsList();
  }
};

// ==========================================
// 2. LOGIKA TAB HOME (Jadwal & Auto-Submit)
// ==========================================
document.getElementById("saveTaskBtn").addEventListener("click", () => {
  const taskName = document.getElementById("taskName").value.trim();
  const formUrl = document.getElementById("formUrl").value.trim();
  const selectedProject = document.getElementById("selectedProject").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;

  if (!taskName || !formUrl || !startTime || !endTime) {
    alert("Harap isi semua kolom jadwal dengan lengkap!");
    return;
  }

  chrome.runtime.sendMessage({
    action: "setAlarm",
    taskName,
    formUrl,
    selectedProject,
    startTime,
    endTime
  }, (response) => {
    if (response && response.status === "success") {
      alert("Jadwal berhasil disimpan!");
      document.getElementById("taskName").value = "";
      document.getElementById("formUrl").value = "";
      switchTab("alarms");
    } else {
      alert("Gagal menyimpan jadwal: " + (response ? response.message : "Kesalahan tidak dikenal"));
    }
  });
});

// ==========================================
// 3. LOGIKA TAB PROJECTS (Manajemen Data Autofill)
// ==========================================
let currentEditingProject = null;

function loadProjectsDropdown() {
  chrome.storage.local.get(["projects"], (data) => {
    const projects = data.projects || {};
    const select = document.getElementById("selectedProject");
    select.innerHTML = '<option value="">-- Tanpa Autofill (Manual) --</option>';
    
    for (let projName in projects) {
      let opt = document.createElement("option");
      opt.value = projName;
      opt.textContent = projName;
      select.appendChild(opt);
    }
  });
}

function loadProjectList() {
  chrome.storage.local.get(["projects"], (data) => {
    const projects = data.projects || {};
    const container = document.getElementById("projectContainer");
    container.innerHTML = "";

    if (Object.keys(projects).length === 0) {
      container.innerHTML = '<p style="font-size:12px; color:#666; text-align:center;">Belum ada project autofill.</p>';
      return;
    }

    for (let projName in projects) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-info">
          <span class="card-title">${projName}</span><br>
          <small style="color:#666;">Jumlah Rules: ${projects[projName].rules.length}</small>
        </div>
        <div>
          <button class="primary-btn" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="editProject('${projName}')">Edit</button>
          <button class="danger-btn" onclick="deleteProject('${projName}')">Hapus</button>
        </div>
      `;
      container.appendChild(card);
    }
  });
}

document.getElementById("newProjectBtn").addEventListener("click", () => {
  const projName = prompt("Masukkan nama project baru (contoh: Absensi Kuliah):");
  if (!projName) return;

  chrome.storage.local.get(["projects"], (data) => {
    const projects = data.projects || {};
    if (projects[projName]) {
      alert("Nama project sudah ada!");
      return;
    }
    projects[projName] = { rules: [] };
    chrome.storage.local.set({ projects }, () => {
      loadProjectsDropdown();
      editProject(projName);
    });
  });
});

window.editProject = function(projName) {
  currentEditingProject = projName;
  document.getElementById("editProjectName").value = projName;
  document.getElementById("projectListView").style.display = "none";
  document.getElementById("projectEditorView").style.display = "block";

  chrome.storage.local.get(["projects"], (data) => {
    const projects = data.projects || {};
    const project = projects[projName] || { rules: [] };
    renderRules(project.rules);
  });
};

window.backToProjectList = function() {
  currentEditingProject = null;
  document.getElementById("projectEditorView").style.display = "none";
  document.getElementById("projectListView").style.display = "block";
  loadProjectList();
  loadProjectsDropdown();
};

function renderRules(rules) {
  const container = document.getElementById("rulesContainer");
  container.innerHTML = "";

  rules.forEach((rule, index) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    row.innerHTML = `
      <select class="rule-type" style="width: 30%;">
        <option value="Text" ${rule.type === 'Text' ? 'selected' : ''}>Text</option>
        <option value="Choice" ${rule.type === 'Choice' ? 'selected' : ''}>Choice</option>
        <option value="Date" ${rule.type === 'Date' ? 'selected' : ''}>Date</option>
      </select>
      <input type="text" class="rule-question" placeholder="Judul Pertanyaan" value="${rule.question || ''}" style="width: 40%;">
      <input type="text" class="rule-value" placeholder="Jawaban / Value" value="${rule.value || ''}" style="width: 25%;">
      <button class="danger-btn" onclick="removeRuleRow(${index})">X</button>
    `;
    container.appendChild(row);
  });
}

document.getElementById("addRuleBtn").addEventListener("click", () => {
  const container = document.getElementById("rulesContainer");
  const row = document.createElement("div");
  row.className = "rule-row";
  row.innerHTML = `
    <select class="rule-type" style="width: 30%;">
      <option value="Text">Text</option>
      <option value="Choice">Choice</option>
      <option value="Date">Date</option>
    </select>
    <input type="text" class="rule-question" placeholder="Judul Pertanyaan" style="width: 40%;">
    <input type="text" class="rule-value" placeholder="Jawaban / Value" style="width: 25%;">
    <button class="danger-btn" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(row);
});

window.removeRuleRow = function(index) {
  chrome.storage.local.get(["projects"], (data) => {
    const projects = data.projects || {};
    if (projects[currentEditingProject]) {
      projects[currentEditingProject].rules.splice(index, 1);
      chrome.storage.local.set({ projects }, () => {
        renderRules(projects[currentEditingProject].rules);
      });
    }
  });
};

document.getElementById("saveProjectBtn").addEventListener("click", () => {
  if (!currentEditingProject) return;

  const rows = document.querySelectorAll("#rulesContainer .rule-row");
  const newRules = [];

  rows.forEach(row => {
    const type = row.querySelector(".rule-type").value;
    const question = row.querySelector(".rule-question").value.trim();
    const value = row.querySelector(".rule-value").value.trim();

    if (question && value) {
      newRules.push({ type, question, value });
    }
  });

  chrome.storage.local.get(["projects"], (data) => {
    const projects = data.projects || {};
    if (projects[currentEditingProject]) {
      projects[currentEditingProject].rules = newRules;
      chrome.storage.local.set({ projects }, () => {
        alert("Project berhasil disimpan!");
        backToProjectList();
      });
    }
  });
});

window.deleteProject = function(projName) {
  if (confirm(`Yakin ingin menghapus project "${projName}"?`)) {
    chrome.storage.local.get(["projects"], (data) => {
      const projects = data.projects || {};
      delete projects[projName];
      chrome.storage.local.set({ projects }, () => {
        loadProjectList();
        loadProjectsDropdown();
      });
    });
  }
};

// ==========================================
// 4. LOGIKA TAB ALARMS (Daftar Tugas Aktif)
// ==========================================
function loadAlarmsList() {
  const container = document.getElementById("alarmsListContainer");
  container.innerHTML = "";

  chrome.storage.local.get(null, (items) => {
    let hasAlarms = false;

    for (let key in items) {
      // Abaikan key 'projects' karena itu bukan data alarm tugas
      if (key === "projects") continue;

      const task = items[key];
      if (task && task.formUrl && task.endTime) {
        hasAlarms = true;
        const card = document.createElement("div");
        card.className = "card";
        
        const startTimeStr = new Date(task.startTime).toLocaleString();
        const endTimeStr = new Date(task.endTime).toLocaleString();

        card.innerHTML = `
          <div class="card-info">
            <span class="card-title">${task.name}</span><br>
            <small>Mulai: ${startTimeStr}</small><br>
            <small>Submit: ${endTimeStr}</small>
            ${task.selectedProject ? `<br><small style="color:#0078d4;">Project: ${task.selectedProject}</small>` : ''}
          </div>
          <button class="danger-btn" onclick="cancelTask('${task.name}')">Hapus</button>
        `;
        container.appendChild(card);
      }
    }

    if (!hasAlarms) {
      container.innerHTML = '<p style="font-size:12px; color:#666; text-align:center;">Tidak ada jadwal alarm aktif.</p>';
    }
  });
}

window.cancelTask = function(taskName) {
  chrome.runtime.sendMessage({ action: "cleanupTask", taskName }, () => {
    loadAlarmsList();
  });
};
