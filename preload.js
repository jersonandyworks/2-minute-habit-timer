// The only bridge between the renderer and Node. Everything the UI can do
// is listed here — contextIsolation stays on.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	listWorkTypes: () => ipcRenderer.invoke("work:types"),
	listHabits: () => ipcRenderer.invoke("habits:list"),
	getHabit: (id) => ipcRenderer.invoke("habits:get", id),
	createHabit: (data) => ipcRenderer.invoke("habits:create", data),
	deleteHabit: (id) => ipcRenderer.invoke("habits:delete", id),
	completeSession: (id, duration) => ipcRenderer.invoke("session:complete", { id, duration }),

	onHabitsChanged: (fn) => ipcRenderer.on("habits:changed", () => fn()),

	saveLogNote: (habitId, logId, note) => ipcRenderer.invoke("log:note", { habitId, logId, note }),

	// popup window only
	onPopupData: (fn) => ipcRenderer.on("popup:data", (event, data) => fn(data)),
	closePopup: () => ipcRenderer.send("popup:close"),
});
