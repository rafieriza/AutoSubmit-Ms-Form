// Memulai eksekusi saat halaman Microsoft Forms selesai dimuat
window.addEventListener("load", () => {
  // Beri sedikit jeda 1.5 detik agar elemen dinamis Ms Forms terisi penuh di DOM
  setTimeout(initAutoFillAndTimer, 1500);
});

function initAutoFillAndTimer() {
  const currentUrl = window.location.href;

  // 1. Cari data tugas aktif dari chrome.storage.local
  chrome.storage.local.get(null, (items) => {
    let activeTask = null;

    for (let key in items) {
      if (key === "projects") continue; // Abaikan data master project
      
      const task = items[key];
      if (task && task.formUrl) {
        // Validasi pencocokan URL secara presisi
        if (currentUrl.includes(task.formUrl) || task.formUrl.includes(currentUrl)) {
          activeTask = task;
          break;
        }
      }
    }

    if (!activeTask) return; // Jika tidak ada tugas yang cocok dengan URL ini, hentikan script.

    // 2. Jika ada project autofill yang dipilih, jalankan Mesin Autofill
    if (activeTask.selectedProject) {
      const selectedProjectName = activeTask.selectedProject;
      const projects = items.projects || {};
      const projectData = projects[selectedProjectName];

      if (projectData && projectData.rules && projectData.rules.length > 0) {
        console.log(`[Autofill] Menjalankan autofill untuk project: "${selectedProjectName}"`);
        executeAutofill(projectData.rules);
      }
    }

    // 3. Jalankan Floating Timer dan hitung mundur Auto-Submit
    if (activeTask.endTime) {
      const now = Date.now();
      const targetEnd = new Date(activeTask.endTime).getTime();

      // Jika waktu sudah terlewat lebih dari 5 menit, bersihkan otomatis
      if (now - targetEnd > 300000) {
        console.log("[Autofill] Tugas kedaluwarsa, membersihkan...");
        chrome.runtime.sendMessage({ action: "cleanupTask", taskName: activeTask.name });
        return;
      }

      createFloatingTimer(targetEnd, activeTask.name);
    }
  });
}

// ==========================================
// MESIN AUTOFILL UNTUK MICROSOFT FORMS
// ==========================================
function executeAutofill(rules) {
  // Mendapatkan semua blok pertanyaan di Microsoft Forms
  // Ms Forms umumnya menggunakan atribut data-automation-id="questionItem"
  const questionBlocks = document.querySelectorAll('[data-automation-id="questionItem"]');

  if (questionBlocks.length === 0) {
    console.warn("[Autofill] Tidak ditemukan blok pertanyaan dengan data-automation-id standar.");
    return;
  }

  questionBlocks.forEach((block) => {
    // Cari judul pertanyaan di dalam blok
    const titleEl = block.querySelector('[data-automation-id="questionTitle"]');
    if (!titleEl) return;

    const questionText = titleEl.innerText.trim();

    // Mencocokkan dengan daftar aturan (rules) dari project
    rules.forEach((rule) => {
      // Pencocokan bersifat case-insensitive (abaikan huruf besar/kecil)
      if (questionText.toLowerCase().includes(rule.question.toLowerCase())) {
        console.log(`[Autofill] Cocok: "${rule.question}" (Tipe: ${rule.type})`);

        if (rule.type === "Text") {
          fillTextInput(block, rule.value);
        } else if (rule.type === "Choice") {
          fillChoiceInput(block, rule.value);
        } else if (rule.type === "Date") {
          fillDateInput(block, rule.value);
        }
      }
    });
  });
}

// Handler 1: Tipe Input Teks (Text)
function fillTextInput(block, value) {
  const inputEl = block.querySelector('input[type="text"], textarea');
  if (inputEl) {
    inputEl.value = value;
    // Trigger event input & change agar React/Vue di Ms Forms menyadari perubahan nilai
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Handler 2: Tipe Pilihan Ganda (Choice / Radio / Checkbox)
function fillChoiceInput(block, targetValue) {
  const options = block.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]');
  
  options.forEach((opt) => {
    // Ambil teks label dari pilihan tersebut
    const parentLabel = opt.closest('label') || opt.parentElement;
    const labelText = parentLabel ? parentLabel.innerText.trim() : "";

    if (labelText.toLowerCase().includes(targetValue.toLowerCase())) {
      if (!opt.checked) {
        opt.click();
      }
    }
  });
}

// Handler 3: Tipe Tanggal (Date)
function fillDateInput(block, value) {
  let dateVal = value;
  
  // Fitur tag khusus <now> untuk mengisi tanggal hari ini secara otomatis (YYYY-MM-DD)
  if (value.toLowerCase() === "<now>") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateVal = `${yyyy}-${mm}-${dd}`;
  }

  const dateInput = block.querySelector('input[type="date"], input[placeholder*="YYYY"], input[placeholder*="yyyy"]');
  if (dateInput) {
    dateInput.value = dateVal;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// ==========================================
// FLOATING TIMER & AUTO SUBMIT LOGIC
// ==========================================
function createFloatingTimer(targetEnd, taskName) {
  if (document.getElementById("msform-floating-timer")) return;

  const timerDiv = document.createElement("div");
  timerDiv.id = "msform-floating-timer";
  timerDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0078d4;
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-weight: bold;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    z-index: 999999;
  `;

  document.body.appendChild(timerDiv);

  const interval = setInterval(() => {
    const now = Date.now();
    const diff = targetEnd - now;

    if (diff <= 0) {
      clearInterval(interval);
      timerDiv.innerText = "Waktu Habis! Mengirimkan Form...";
      timerDiv.style.background = "#d9534f";

      setTimeout(() => {
        triggerSubmit(taskName);
      }, 1000);
    } else {
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      timerDiv.innerText = `AutoSubmit [${taskName}]: ${minutes}m ${seconds}s`;
    }
  }, 1000);
}

function triggerSubmit(taskName) {
  // Cari tombol Submit standar di Microsoft Forms
  const submitBtn = document.querySelector('button[data-automation-id="submitButton"]') || 
                    document.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.click();
    console.log("[Autofill] Tombol submit berhasil diklik!");
  } else {
    console.warn("[Autofill] Tombol submit tidak ditemukan di DOM.");
  }

  // Kirim sinyal ke background.js untuk menghapus tugas & alarm
  chrome.runtime.sendMessage({ action: "cleanupTask", taskName: taskName });
}
