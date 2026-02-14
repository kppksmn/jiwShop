const { app, BrowserWindow } = require("electron");
const path = require("path");

// ตรวจสอบว่าโปรแกรมถูกแพ็คหรือยัง
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // แก้ไขการโหลดไฟล์ตรงนี้
  if (isDev) {
    // ช่วงพัฒนาให้โหลดจาก localhost
    win.loadURL("http://localhost:3000");
  } else {
    // ช่วงที่แพ็คเป็น .exe แล้ว
    // ไฟล์จะอยู่ที่: resources/app.asar/build/index.html
    // แต่ electron.js อยู่ใน: resources/app.asar/public/electron.js
    // จึงต้องถอยออกมา 1 ชั้นด้วย '..'
    win.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});