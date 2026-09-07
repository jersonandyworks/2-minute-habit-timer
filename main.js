const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

const quotes = require("./quotes");
const { WORK_TYPES, WORK_QUOTES } = require("./work-quotes");
const store = require("./store");

let mainWindow = null;
let popupWindow = null;
let reminderTimer = null;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatClock(time) {
	const [h, m] = time.split(":").map(Number);
	const suffix = h >= 12 ? "PM" : "AM";
	const hour12 = h % 12 === 0 ? 12 : h % 12;
	return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function pick(list) {
	return list[Math.floor(Math.random() * list.length)];
}

// A habit with a work type draws from that trade's quotes; everything else
// falls back to the general collection.
function quoteFor(habit) {
	const pool = habit && WORK_QUOTES[habit.workType];
	if (pool && pool.length) return pick(pool);

	return { text: pick(quotes), by: "" };
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 400,
		height: 700,
		minWidth: 380,
		minHeight: 620,
		icon: path.join(__dirname, "build/icon.ico"),
		autoHideMenuBar: true,
		backgroundColor: "#F2FCFE",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	Menu.setApplicationMenu(null);
	mainWindow.loadFile("index.html");

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// Only ever one popup. A second finished session reuses the open window.
// The finished-session popup carries a note field, so it needs more room.
function popupHeight(kind) {
	return kind === "done" ? 470 : 340;
}

function showPopup({ kind, title, message, note, quote, target }) {
	const payload = { kind, title, message, note: note || "", quote, target: target || null };

	if (popupWindow) {
		popupWindow.setSize(460, popupHeight(kind));
		popupWindow.center();
		popupWindow.webContents.send("popup:data", payload);
		popupWindow.show();
		popupWindow.focus();
		return;
	}

	popupWindow = new BrowserWindow({
		width: 460,
		height: popupHeight(kind),
		icon: path.join(__dirname, "build/icon.ico"),
		alwaysOnTop: true,
		resizable: false,
		autoHideMenuBar: true,
		backgroundColor: "#F2FCFE",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	popupWindow.loadFile("popup.html");

	popupWindow.webContents.on("did-finish-load", () => {
		popupWindow.webContents.send("popup:data", payload);
	});

	popupWindow.on("closed", () => {
		popupWindow = null;
	});
}

function minutesOf(time) {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

// How long after a session window closes we will still announce it. Without this,
// opening the app at midnight would pop up every window that closed during the day.
const SESSION_END_GRACE = 15; // minutes

function appliesToday(habit, dayKey) {
	return habit.reminderDay === "daily" || habit.reminderDay === dayKey;
}

function logsToday(habit) {
	const today = new Date().toDateString();
	return habit.logs.filter((entry) => new Date(entry.at).toDateString() === today).length;
}

// Fires once per habit per day, the first time the clock is inside the habit's
// reminder window. Opening the app mid-window still catches it; once the window
// has closed the reminder is skipped for the day.
function checkReminder(habit, { dayKey, dateKey, nowMinutes }) {
	if (!habit.reminderStart || !habit.reminderEnd) return false;
	if (!appliesToday(habit, dayKey)) return false;
	if (habit.lastReminded === dateKey) return false;

	const start = minutesOf(habit.reminderStart);
	const end = minutesOf(habit.reminderEnd);
	const inWindow = start <= end
		? nowMinutes >= start && nowMinutes < end
		: nowMinutes >= start || nowMinutes < end; // window crosses midnight

	if (!inWindow) return false;

	store.markReminded(habit.id, dateKey);
	showPopup({
		kind: "reminder",
		title: "Time for your habit",
		message: `${habit.name} · until ${formatClock(habit.reminderEnd)}`,
		quote: quoteFor(habit),
	});
	return true;
}

// Announces the close of the habit's session window, once per day, within
// SESSION_END_GRACE minutes of the end time.
function checkSessionEnd(habit, { dayKey, dateKey, nowMinutes }) {
	if (!habit.sessionStart || !habit.sessionEnd) return false;
	if (!appliesToday(habit, dayKey)) return false;
	if (habit.lastSessionEnded === dateKey) return false;

	const sinceEnd = (nowMinutes - minutesOf(habit.sessionEnd) + 1440) % 1440;
	if (sinceEnd >= SESSION_END_GRACE) return false;

	const done = logsToday(habit);

	store.markSessionEnded(habit.id, dateKey);
	showPopup({
		kind: "session-end",
		title: "Session window closed",
		message: `${habit.name} · ${formatClock(habit.sessionStart)} – ${formatClock(habit.sessionEnd)}`,
		note: done
			? `${done} session${done === 1 ? "" : "s"} logged today.`
			: "Nothing logged in that window.",
		quote: quoteFor(habit),
	});
	return true;
}

function checkSchedules() {
	const now = new Date();
	const context = {
		dayKey: DAY_KEYS[now.getDay()],
		dateKey: now.toISOString().slice(0, 10),
		nowMinutes: now.getHours() * 60 + now.getMinutes(),
	};

	let changed = false;

	for (const habit of store.list()) {
		if (checkReminder(habit, context)) changed = true;
		if (checkSessionEnd(habit, context)) changed = true;
	}

	if (changed && mainWindow) mainWindow.webContents.send("habits:changed");
}

app.whenReady().then(() => {
	store.init(app.getPath("userData"));
	createWindow();
	reminderTimer = setInterval(checkSchedules, 20000);
});

/* ───────────── IPC ───────────── */

ipcMain.handle("work:types", () => WORK_TYPES);
ipcMain.handle("habits:list", () => store.list());
ipcMain.handle("habits:get", (event, id) => store.get(id));
ipcMain.handle("habits:create", (event, data) => store.create(data));
ipcMain.handle("habits:delete", (event, id) => store.remove(id));

// A finished session: log it, then celebrate with a random quote.
ipcMain.handle("session:complete", (event, { id, duration }) => {
	const habit = store.addLog(id, duration);

	showPopup({
		kind: "done",
		title: "Your session is done",
		message: habit ? habit.name : "",
		quote: quoteFor(habit),
		// what the note field will be attached to
		target: habit ? { habitId: habit.id, logId: habit.logs[0].id } : null,
	});

	return habit;
});

// The note arrives from the popup after the session is already logged.
ipcMain.handle("log:note", (event, { habitId, logId, note }) => {
	const habit = store.setLogNote(habitId, logId, note);
	if (habit && mainWindow) mainWindow.webContents.send("habits:changed");
	return habit;
});

ipcMain.on("popup:close", () => {
	if (popupWindow) popupWindow.close();
});

app.on("window-all-closed", () => {
	clearInterval(reminderTimer);
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
