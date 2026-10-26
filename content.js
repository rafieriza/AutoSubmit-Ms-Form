// Mendengarkan data End Time yang dikirim dari background/popup saat tab terbuka
chrome.storage.local.get(null, (items) => {
  // Cari data tugas yang cocok dengan URL halaman saat ini
  const currentUrl = window.location.href;
  let activeTask = null;

  for (let key in items) {
    if (items[key] && items[key].formUrl && currentUrl.includes(items[key].formUrl)) {
      activeTask = items[key];
      break;
    }
  }

  if (activeTask && activeTask.endTime) {
    createFloatingTimer(new Date(activeTask.endTime).getTime());
  }
});

function createFloatingTimer(targetEndTime) {
  // Buat elemen kotak timer di pojok kiri atas
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
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    text-align: center;
    border: 2px solid #0078d4;
  `;

  timerBox.innerHTML = `
    <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #333;">Timer</div>
    <div id="countdownDisplay" style="font-size: 16px; font-weight: bold; color: #d9534f; margin-bottom: 8px;">00:00:00</div>
    <div>
      <button id="stopTimerBtn" style="background: #d9534f; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px;">STOP</button>
      <button id="addTimerBtn" style="background: #0078d4; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">ADD</button>
    </div>
  `;

  document.body.appendChild(timerBox);

  const display = document.getElementById('countdownDisplay');

  // Jalankan hitung mundur setiap detik
  const interval = setInterval(() => {
    const now = Date.now();
    const distance = targetEndTime - now;

    if (distance <= 0) {
      clearInterval(interval);
      display.innerText = "00:00:00";
      triggerSubmit();
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

  // Tombol STOP untuk menghapus timer
  document.getElementById('stopTimerBtn').addEventListener('click', () => {
    clearInterval(interval);
    timerBox.remove();
  });

  // Tombol ADD untuk menambah waktu 1 menit (opsional)
  document.getElementById('addTimerBtn').addEventListener('click', () => {
    targetEndTime += 60000;
  });
}

// Fungsi otomatis mencari dan mengeklik tombol Kirim / Submit Microsoft Forms
function triggerSubmit() {
  // Strategi 1: Cari berdasarkan data-automation-id
  let submitBtn = document.querySelector('button[data-automation-id="submitButton"]');

  // Strategi 2: Cari manual berdasarkan teks tombol "Kirim" atau "Submit"
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
  } else {
    console.log("Tombol submit tidak ditemukan di halaman ini.");
  }
}
