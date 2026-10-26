// Mendengarkan pesan dari popup.js saat pengguna berhasil membuat jadwal baru
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setAlarm") {
    const { taskName, formUrl, startTime, endTime } = request;
    
    // Hitung selisih waktu dari sekarang ke Start Time (dalam milidetik ke menit)
    const delayInMinutes = (new Date(startTime).getTime() - Date.now()) / 60000;

    if (delayInMinutes > 0) {
      // Buat alarm berdasarkan nama tugas
      chrome.alarms.create(taskName, { delayInMinutes: delayInMinutes });

      // Simpan data taskName, formUrl, dan endTime ke chrome.storage.local
      chrome.storage.local.set({ 
        [taskName]: { 
          name: taskName,
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
  // Fitur Auto-Delete: Menghapus tugas dari storage & alarms setelah selesai
  else if (request.action === "cleanupTask") {
    const taskName = request.taskName;
    
    chrome.storage.local.remove(taskName, () => {
      chrome.alarms.clear(taskName, () => {
        console.log(`Tugas "${taskName}" telah selesai dan dibersihkan secara otomatis.`);
        sendResponse({ status: "success" });
      });
    });
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
      });
    }
  });
});
