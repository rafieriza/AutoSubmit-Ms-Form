// Mendengarkan pesan dari popup.js saat pengguna berhasil membuat jadwal baru
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setAlarm") {
    const { taskName, formUrl, startTime, endTime } = request;
    
    // Hitung selisih waktu dari sekarang ke Start Time (dalam milidetik ke menit)
    const delayInMinutes = (new Date(startTime).getTime() - Date.now()) / 60000;

    if (delayInMinutes > 0) {
      // Buat alarm berdasarkan nama tugas
      chrome.alarms.create(taskName, { delayInMinutes: delayInMinutes });

      // Simpan data formUrl dan endTime ke chrome.storage.local agar bisa diakses nanti
      chrome.storage.local.set({ 
        [taskName]: { 
          formUrl: formUrl, 
          endTime: endTime 
        } 
      }, () => {
        console.log(`Alarm "${taskName}" berhasil disetel untuk berjalan pada: ${startTime}`);
        sendResponse({ status: "success", message: "Jadwal berhasil disimpan!" });
      });
    } else {
      sendResponse({ status: "error", message: "Waktu mulai sudah terlewat!" });
    }
  }
  return true;
});

// Menjalankan aksi ketika waktu Start Time tiba
chrome.alarms.onAlarm.addListener((alarm) => {
  const taskName = alarm.name;

  // Ambil data URL dan End Time yang tersimpan
  chrome.storage.local.get([taskName], (data) => {
    const taskData = data[taskName];

    if (taskData && taskData.formUrl) {
      // Buka tab baru secara otomatis menuju link Microsoft Forms
      chrome.tabs.create({ url: taskData.formUrl }, (tab) => {
        console.log(`Membuka form otomatis untuk tugas: ${taskName}`);
        
        // Di sini nanti kita bisa mengirim data End Time ke tab tersebut 
        // untuk memunculkan Floating Timer dan menjalankan Auto-Submit
      });
    }
  });
});
