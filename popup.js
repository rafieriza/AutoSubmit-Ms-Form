document.addEventListener('DOMContentLoaded', () => {
  const homeView = document.getElementById('homeView');
  const projectsView = document.getElementById('projectsView');
  const alarmsView = document.getElementById('alarmsView');
  
  const navHome = document.getElementById('navHome');
  const navProjects = document.getElementById('navProjects');
  const navAlarms = document.getElementById('navAlarms');
  
  // Element Home Form
  const formName = document.getElementById('formName');
  const formUrl = document.getElementById('formUrl');
  const selectedProject = document.getElementById('selectedProject');
  const startTime = document.getElementById('startTime');
  const endTime = document.getElementById('endTime');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  // Element Projects
  const projectListView = document.getElementById('projectListView');
  const projectEditorView = document.getElementById('projectEditorView');
  const projectList = document.getElementById('projectList');
  const newProjectBtn = document.getElementById('newProjectBtn');
  const backToProjectsBtn = document.getElementById('backToProjectsBtn');
  const editProjectName = document.getElementById('editProjectName');
  const rulesContainer = document.getElementById('rulesContainer');
  const addRuleBtn = document.getElementById('addRuleBtn');
  const saveProjectBtn = document.getElementById('saveProjectBtn');
  
  // Element Alarms
  const alarmList = document.getElementById('alarmList');

  let currentEditingProject = null;

  // ==========================================
  // 1. NAVIGASI 3 TAB
  // ==========================================
  function switchTab(target) {
    homeView.style.display = 'none';
    projectsView.style.display = 'none';
    alarmsView.style.display = 'none';
    
    navHome.classList.remove('active');
    navProjects.classList.remove('active');
    navAlarms.classList.remove('active');

    if (target === 'home') {
      homeView.style.display = 'block';
      navHome.classList.add('active');
      loadProjectsDropdown();
    } else if (target === 'projects') {
      projectsView.style.display = 'block';
      navProjects.classList.add('active');
      projectListView.style.display = 'block';
      projectEditorView.style.display = 'none';
      loadProjectList();
    } else if (target === 'alarms') {
      alarmsView.style.display = 'block';
      navAlarms.classList.add('active');
      loadAlarmList();
    }
  }

  navHome.addEventListener('click', () => switchTab('home'));
  navProjects.addEventListener('click', () => switchTab('projects'));
  navAlarms.addEventListener('click', () => switchTab('alarms'));

  // ==========================================
  // 2. VALIDASI WAKTU REAL-TIME (Garis Merah)
  // ==========================================
  function validateTime() {
    const now = new Date().getTime();
    const startVal = new Date(startTime.value).getTime();
    const endVal = new Date(endTime.value).getTime();

    let isValid = true;

    if (startTime.value && startVal <= now) {
      startTime.classList.add('error-border');
      isValid = false;
    } else {
      startTime.classList.remove('error-border');
    }

    if (startTime.value && endTime.value && endVal <= startVal) {
      endTime.classList.add('error-border');
      isValid = false;
    } else {
      endTime.classList.remove('error-border');
    }

    return isValid && formName.value.trim() !== '' && formUrl.value.trim() !== '';
  }

  startTime.addEventListener('input', validateTime);
  endTime.addEventListener('input', validateTime);
  formName.addEventListener('input', validateTime);
  formUrl.addEventListener('input', validateTime);

  // Tombol Submit Jadwal (Home)
  submitBtn.addEventListener('click', () => {
    if (!validateTime()) {
      alert('Mohon isi form dengan benar dan pastikan waktu tidak kedaluwarsa!');
      return;
    }

    const taskName = formName.value.trim();
    const url = formUrl.value.trim();
    const proj = selectedProject.value;
    const start = startTime.value;
    const end = endTime.value;

    chrome.runtime.sendMessage({
      action: "setAlarm",
      taskName: taskName,
      formUrl: url,
      selectedProject: proj,
      startTime: start,
      endTime: end
    }, (response) => {
      if (response && response.status === "success") {
        alert('Jadwal Auto-Submit berhasil disimpan!');
        formName.value = '';
        formUrl.value = '';
        selectedProject.value = '';
        startTime.value = '';
        endTime.value = '';
        switchTab('alarms');
      } else {
        alert('Gagal menyimpan jadwal: ' + (response ? response.message : 'Unknown error'));
      }
    });
  });

  resetBtn.addEventListener('click', () => {
    formName.value = '';
    formUrl.value = '';
    selectedProject.value = '';
    startTime.value = '';
    endTime.value = '';
    startTime.classList.remove('error-border');
    endTime.classList.remove('error-border');
  });

  // ==========================================
  // 3. MANAJEMEN TAB PROJECTS & RULES
  // ==========================================
  function loadProjectsDropdown() {
    chrome.storage.local.get(["projects"], (data) => {
      const projects = data.projects || {};
      selectedProject.innerHTML = '<option value="">-- Tanpa Autofill (Manual) --</option>';
      for (let pName in projects) {
        let opt = document.createElement('option');
        opt.value = pName;
        opt.textContent = pName;
        selectedProject.appendChild(opt);
      }
    });
  }

  function loadProjectList() {
    chrome.storage.local.get(["projects"], (data) => {
      const projects = data.projects || {};
      projectList.innerHTML = '';
      const keys = Object.keys(projects);

      if (keys.length === 0) {
        projectList.innerHTML = '<p class="no-data">Belum ada project autofill.</p>';
        return;
      }

      keys.forEach((pName) => {
        const ruleCount = projects[pName].rules ? projects[pName].rules.length : 0;
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = `
          <div class="card-info">
            <p class="card-title">📁 ${pName}</p>
            <p class="card-subtitle">Jumlah Rules: ${ruleCount}</p>
          </div>
          <div>
            <button class="edit-btn" data-name="${pName}">Edit</button>
            <button class="delete-btn" data-del="${pName}">🗑️</button>
          </div>
        `;
        projectList.appendChild(div);
      });

      // Tombol Edit Project
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const name = e.target.getAttribute('data-name');
          openProjectEditor(name);
        });
      });

      // Tombol Hapus Project
      document.querySelectorAll('.delete-btn[data-del]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const name = e.target.getAttribute('data-del');
          if (confirm(`Yakin ingin menghapus project "${name}"?`)) {
            delete projects[name];
            chrome.storage.local.set({ projects }, () => {
              loadProjectList();
            });
          }
        });
      });
    });
  }

  newProjectBtn.addEventListener('click', () => {
    const pName = prompt("Masukkan nama project baru (contoh: Absensi Kuliah):");
    if (!pName) return;

    chrome.storage.local.get(["projects"], (data) => {
      const projects = data.projects || {};
      if (projects[pName]) {
        alert("Nama project sudah ada!");
        return;
      }
      projects[pName] = { rules: [] };
      chrome.storage.local.set({ projects }, () => {
        openProjectEditor(pName);
      });
    });
  });

  function openProjectEditor(pName) {
    currentEditingProject = pName;
    projectListView.style.display = 'none';
    projectEditorView.style.display = 'block';
    editProjectName.value = pName;

    chrome.storage.local.get(["projects"], (data) => {
      const projects = data.projects || {};
      const rules = (projects[pName] && projects[pName].rules) ? projects[pName].rules : [];
      renderRules(rules);
    });
  }

  backToProjectsBtn.addEventListener('click', () => {
    currentEditingProject = null;
    projectEditorView.style.display = 'none';
    projectListView.style.display = 'block';
    loadProjectList();
  });

  function renderRules(rules) {
    rulesContainer.innerHTML = '';
    rules.forEach((rule, index) => {
      const row = document.createElement('div');
      row.className = 'rule-row';
      row.innerHTML = `
        <select class="rule-type">
          <option value="Text" ${rule.type === 'Text' ? 'selected' : ''}>Text</option>
          <option value="Choice" ${rule.type === 'Choice' ? 'selected' : ''}>Choice</option>
          <option value="Date" ${rule.type === 'Date' ? 'selected' : ''}>Date</option>
        </select>
        <input type="text" class="rule-q" placeholder="Pertanyaan" value="${rule.question || ''}">
        <input type="text" class="rule-v" placeholder="Jawaban" value="${rule.value || ''}">
        <button class="delete-btn" onclick="this.parentElement.remove()" style="font-size:12px;">❌</button>
      `;
      rulesContainer.appendChild(row);
    });
  }

  addRuleBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.innerHTML = `
      <select class="rule-type">
        <option value="Text">Text</option>
        <option value="Choice">Choice</option>
        <option value="Date">Date</option>
      </select>
      <input type="text" class="rule-q" placeholder="Pertanyaan">
      <input type="text" class="rule-v" placeholder="Jawaban">
      <button class="delete-btn" onclick="this.parentElement.remove()" style="font-size:12px;">❌</button>
    `;
    rulesContainer.appendChild(row);
  });

  saveProjectBtn.addEventListener('click', () => {
    if (!currentEditingProject) return;

    const rows = rulesContainer.querySelectorAll('.rule-row');
    const newRules = [];

    rows.forEach(row => {
      const type = row.querySelector('.rule-type').value;
      const question = row.querySelector('.rule-q').value.trim();
      const value = row.querySelector('.rule-v').value.trim();

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
          backToProjectsBtn.loadProjectList; // kembali
          switchTab('projects');
        });
      }
    });
  });

  // ==========================================
  // 4. MANAJEMEN TAB ALARMS
  // ==========================================
  function loadAlarmList() {
    chrome.storage.local.get(null, (items) => {
      alarmList.innerHTML = '';
      
      const keys = Object.keys(items).filter(k => k !== 'projects' && items[k] && items[k].endTime);

      if (keys.length === 0) {
        alarmList.innerHTML = '<p class="no-data">Belum ada alarm tersimpan.</p>';
        return;
      }

      keys.forEach((key) => {
        const data = items[key];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'card-item';
        
        itemDiv.innerHTML = `
          <div class="card-info">
            <p class="card-title">⏰ ${key}</p>
            <p class="card-subtitle">Batas: ${new Date(data.endTime).toLocaleString()}</p>
            ${data.selectedProject ? `<p class="card-subtitle" style="color:#0078d4;">Project: ${data.selectedProject}</p>` : ''}
          </div>
          <button class="delete-btn" data-name="${key}">🗑️</button>
        `;

        alarmList.appendChild(itemDiv);
      });

      document.querySelectorAll('.delete-btn[data-name]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const nameToDelete = e.target.getAttribute('data-name');
          chrome.runtime.sendMessage({ action: "cleanupTask", taskName: nameToDelete }, () => {
            loadAlarmList();
          });
        });
      });
    });
  }

  // Load awal dropdown saat popup dibuka
  loadProjectsDropdown();
});
