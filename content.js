// Cek data tugas yang tersimpan saat halaman Microsoft Forms terbuka
chrome.storage.local.get(null, (items) => {
  const currentUrl = window.location.href;
  let activeTask = null;

  // Cari tugas yang URL-nya cocok dengan tab yang sedang dibuka
  for (let key in items) {
    if (items[key] && items[key].formUrl) {
      if (currentUrl.includes(items[key].formUrl) || items[key].formUrl.includes(currentUrl)) {
        activeTask = items[key];
        break;
      }
    }
  }

  // Fallback: Jika tidak ketemu persis, ambil tugas terakhir yang tersimpan
  if (!activeTask) {
    const keys = Object.keys(items).filter(k => items[k] && items[k].endTime);
    if (keys.length > 0) {
      activeTask = items[keys[keys.length - 1]];
    }
  }

  if (activeTask && activeTask.endTime) {
    createFloatingTimer(new Date(activeTask.endTime).getTime(), activeTask.name);
  }
});

function createFloatingTimer(targetEndTime, taskName) {
  // Cegah duplikasi timer jika sudah ada
  if (document.getElementById('autoSubmitTimerBox')) return;

  const timerBox = document.createElement('div');
  timerBox.id = 'autoSubmitTimerBox';
  timerBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 999999;
    background: white;
    padding: 10px 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: Arial, sans-serif;
    text-align: center;
    border: 2px solid #0078d4;
  `;

  timerBox.innerHTML = `
    <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #333;">Auto-Submit Timer</div>
    <div id="countdownDisplay" style="font-size: 16px; font-weight: bold; color: #d9534f; margin-bottom: 8px;">00:00:00</div>
    <div>
      <button id="stopTimerBtn" style="background: #d9534f; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">STOP</button>
    </div>
  `;

  document.body.appendChild(timerBox);

  const display = document.getElementById('countdownDisplay');

  const interval = setInterval(() => {
    const now = Date.now();
    const distance = targetEndTime - now;

    if (distance <= 0) {
      clearInterval(interval);
      display.innerText = "00:00:00";
      triggerSubmit(taskName);
      return;
    }

    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    display.innerText = 
      String(hours).padStart(2, '0') + ":" + 
      String(minutes).padStart(2, '0') + ":" + 
      String(seconds).padStart(2, '0');
  }, 1000);

  document.getElementById('stopTimerBtn').addEventListener('click', () => {
    clearInterval(interval);
    timerBox.remove();
  });
}

function triggerSubmit(taskName) {
  // Strategi 1: Cari berdasarkan atribut khusus Microsoft Forms
  let submitBtn = document.querySelector('button[data-automation-id="submitButton"]');

  // Strategi 2: Cari manual dari teks tombol "Kirim" atau "Submit"
  if (!submitBtn) {
    const buttons = document.querySelectorAll('button');
    for (let btn of buttons) {
      if (btn.innerText.includes('Kirim') || btn.innerText.includes('Submit')) {
        submitBtn = btn;
        break;
      }
    }
  }

  if (submitBtn) {
    submitBtn.click();
    console.log("Auto-submit berhasil dieksekusi!");

    // Eksekusi pembersihan otomatis (Auto-Delete data setelah submit)
    if (taskName) {
      chrome.runtime.sendMessage({ action: "cleanupTask", taskName: taskName }, (response) => {
        console.log("Cleanup status:", response);
      });
    }
  } else {
    console.log("Tombol submit tidak ditemukan.");
  }
}
