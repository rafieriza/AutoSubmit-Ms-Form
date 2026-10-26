// Mendengarkan pesan dari popup.js saat pengguna membuat jadwal baru
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setAlarm") {
    const { taskName, formUrl, selectedProject, startTime, endTime } = request;
    
    const startTimeMs = new Date(startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const now = Date.now();

    const delayInMinutes = (startTimeMs - now) / 60000;

    if (delayInMinutes > 0) {
      // Buat alarm untuk waktu mulai (Start Time)
      chrome.alarms.create(taskName, { delayInMinutes: delayInMinutes });

      // Simpan data lengkap ke chrome.storage.local (termasuk project autofill yang dipilih)
      chrome.storage.local.set({ 
        [taskName]: { 
          name: taskName,
          formUrl: formUrl, 
          selectedProject: selectedProject || "",
          startTime: startTimeMs,
          endTime: endTimeMs 
        } 
      }, () => {
        console.log(`Alarm "${taskName}" dengan project "${selectedProject || 'Tanpa Autofill'}" berhasil disetel!`);
        sendResponse({ status: "success", message: "Jadwal berhasil disimpan!" });
      });
    } else {
      sendResponse({ status: "error", message: "Waktu mulai sudah terlewat!" });
    }
  } 
  // Menangani pembersihan data (cleanup) secara instan
  else if (request.action === "cleanupTask") {
    const taskName = request.taskName;
    
    chrome.storage.local.remove(taskName, () => {
      chrome.alarms.clear(taskName, () => {
        console.log(`Data tugas "${taskName}" dibersihkan tuntas.`);
        sendResponse({ status: "success" });
      });
    });
  }
  return true;
});

// Ketika alarm Start Time berbunyi
chrome.alarms.onAlarm.addListener((alarm) => {
  const taskName = alarm.name;

  chrome.storage.local.get([taskName], (data) => {
    const taskData = data[taskName];

    if (taskData && taskData.formUrl) {
      // Validasi pengaman: Jika waktu End Time sudah terlewat lebih dari 10 menit, jangan buka tab
      if (Date.now() > taskData.endTime + 600000) {
        console.log(`Tugas "${taskName}" sudah kedaluwarsa total, membersihkan...`);
        chrome.storage.local.remove(taskName);
        chrome.alarms.clear(taskName);
        return;
      }

      // Buka tab form otomatis
      chrome.tabs.create({ url: taskData.formUrl }, (tab) => {
        console.log(`Membuka form otomatis untuk: ${taskName} (Project: ${taskData.selectedProject || 'Manual'})`);
      });
    }
  });
});
