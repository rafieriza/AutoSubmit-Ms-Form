document.addEventListener('DOMContentLoaded', () => {
  const homeView = document.getElementById('homeView');
  const alarmsView = document.getElementById('alarmsView');
  const navHome = document.getElementById('navHome');
  const navAlarms = document.getElementById('navAlarms');
  
  const formName = document.getElementById('formName');
  const formUrl = document.getElementById('formUrl');
  const startTime = document.getElementById('startTime');
  const endTime = document.getElementById('endTime');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetBtn');
  const alarmList = document.getElementById('alarmList');

  // Navigasi Bawah (Home vs Alarms)
  navHome.addEventListener('click', () => {
    homeView.style.display = 'block';
    alarmsView.style.display = 'none';
    navHome.classList.add('active');
    navAlarms.classList.remove('active');
  });

  navAlarms.addEventListener('click', () => {
    homeView.style.display = 'none';
    alarmsView.style.display = 'block';
    navAlarms.classList.add('active');
    navHome.classList.remove('active');
    loadAlarmList();
  });

  // Validasi Waktu Real-time (Garis Merah jika sudah lewat)
  function validateTime() {
    const now = new Date().getTime();
    const startVal = new Date(startTime.value).getTime();
    const endVal = new Date(endTime.value).getTime();

    let isValid = true;

    // Cek Start Time
    if (startTime.value && startVal <= now) {
      startTime.classList.add('error-border');
      isValid = false;
    } else {
      startTime.classList.remove('error-border');
    }

    // Cek End Time harus setelah Start Time
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

  // Tombol Submit: Kirim data ke background.js
  submitBtn.addEventListener('click', () => {
    if (!validateTime()) {
      alert('Mohon isi form dengan benar dan pastikan waktu tidak kedaluwarsa!');
      return;
    }

    const taskName = formName.value.trim();
    const url = formUrl.value.trim();
    const start = startTime.value;
    const end = endTime.value;

    // Kirim pesan ke background.js untuk set alarm
    chrome.runtime.sendMessage({
      action: "setAlarm",
      taskName: taskName,
      formUrl: url,
      startTime: start,
      endTime: end
    }, (response) => {
      if (response && response.status === "success") {
        alert('Jadwal Auto-Submit berhasil disimpan!');
        // Reset form
        formName.value = '';
        formUrl.value = '';
        startTime.value = '';
        endTime.value = '';
        loadAlarmList();
      } else {
        alert('Gagal menyimpan jadwal: ' + (response ? response.message : 'Unknown error'));
      }
    });
  });

  // Tombol Reset
  resetBtn.addEventListener('click', () => {
    formName.value = '';
    formUrl.value = '';
    startTime.value = '';
    endTime.value = '';
    startTime.classList.remove('error-border');
    endTime.classList.remove('error-border');
  });

  // Fungsi memuat daftar alarm yang tersimpan ke tab Alarms
  function loadAlarmList() {
    chrome.storage.local.get(null, (items) => {
      alarmList.innerHTML = '';
      
      // Filter key yang tersimpan (abaikan yang bukan format tugas)
      const keys = Object.keys(items).filter(k => items[k] && items[k].endTime);

      if (keys.length === 0) {
        alarmList.innerHTML = '<p class="no-alarm">Belum ada alarm tersimpan.</p>';
        return;
      }

      keys.forEach((key) => {
        const data = items[key];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'alarm-item';
        
        itemDiv.innerHTML = `
          <div class="alarm-info">
            <p class="alarm-title">⏰ ${key}</p>
            <p class="alarm-time">Batas: ${new Date(data.endTime).toLocaleString()}</p>
          </div>
          <button class="delete-btn" data-name="${key}">🗑️</button>
        `;

        alarmList.appendChild(itemDiv);
      });

      // Tombol Hapus Alarm
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const nameToDelete = e.target.getAttribute('data-name');
          chrome.storage.local.remove(nameToDelete, () => {
            chrome.alarms.clear(nameToDelete, () => {
              loadAlarmList();
            });
          });
        });
      });
    });
  }
});
