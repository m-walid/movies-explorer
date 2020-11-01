const electron = require("electron");
const url = require("url");
const path = require("path");
const { app, BrowserWindow, Menu } = electron;

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1100,
    minWidth: 800,
    minHeight: 700,
    center: true,
    icon: "build/icon.ico",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "src/index.html"),
      protocol: "file:",
      slashes: true,
    })
  );
  const mainMenu = Menu.buildFromTemplate([]);
      Menu.setApplicationMenu(mainMenu)
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})