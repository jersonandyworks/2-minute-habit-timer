// Habit persistence. One JSON file in the Electron userData directory —
// no database, no dependencies.

const fs = require("fs");
const path = require("path");

let filePath = null;
let cache = null;

function init(userDataPath) {
	filePath = path.join(userDataPath, "habits.json");
	cache = read();
}

function read() {
	try {
		const raw = fs.readFileSync(filePath, "utf8");
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed.habits) ? parsed.habits.map(migrate) : [];
	} catch (err) {
		// Missing file on first run is expected; anything else is worth knowing about.
		if (err.code !== "ENOENT") console.error("Could not read habits.json:", err);
		return [];
	}
}

function write() {
	try {
		fs.writeFileSync(filePath, JSON.stringify({ habits: cache }, null, "\t"), "utf8");
	} catch (err) {
		console.error("Could not write habits.json:", err);
	}
}

// Older saves are brought forward field by field:
//   - reminders used to be a single `reminderTime` -> becomes a one-hour window
//   - session windows did not exist at all -> left empty, meaning "no session window"
function migrate(habit) {
	if (habit.reminderStart === undefined) {
		const start = habit.reminderTime || "";
		delete habit.reminderTime;
		habit.reminderStart = start;
		habit.reminderEnd = start ? addHour(start) : "";
	}

	if (habit.sessionStart === undefined) {
		habit.sessionStart = "";
		habit.sessionEnd = "";
		habit.lastSessionEnded = "";
	}

	// Habits from before the icon picker keep an empty icon; the renderer falls
	// back to cycling through the set for those.
	if (habit.icon === undefined) habit.icon = "";

	// Work type arrived after icons; "" means "no type picked".
	if (habit.workType === undefined) habit.workType = "";

	// Log entries predate ids and notes; backfill so both can be relied on.
	habit.logs.forEach((entry, i) => {
		if (entry.id === undefined) entry.id = `l_legacy_${i}_${entry.at}`;
		if (entry.note === undefined) entry.note = "";
	});

	return habit;
}

function addHour(time) {
	const [h, m] = time.split(":").map(Number);
	return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function list() {
	return cache;
}

function get(id) {
	return cache.find((h) => h.id === id) || null;
}

function create({ name, description, icon, workType, reminderStart, reminderEnd, reminderDay, sessionStart, sessionEnd, duration }) {
	const habit = {
		id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name: String(name || "").trim() || "Untitled Habit",
		description: String(description || "").trim(),
		icon: icon || "",                    // a key from icons.js, "" means fall back
		workType: workType || "",            // a key from work-quotes.js, picks the quote pool
		reminderStart: reminderStart || "",  // "15:00", empty means no reminder
		reminderEnd: reminderEnd || "",      // "17:00", the window closes here
		reminderDay: reminderDay || "daily", // "daily" | "mon".."sun"
		sessionStart: sessionStart || "",    // "13:00", the daily window to do the habit in
		sessionEnd: sessionEnd || "",        // "14:00", a popup announces this closing
		duration: Number(duration) || 120,   // seconds — length of the focus countdown
		createdAt: new Date().toISOString(),
		lastReminded: "",                    // "YYYY-MM-DD", stops repeat firing same day
		lastSessionEnded: "",                // same guard for the session-window popup
		logs: [],                            // [{ at: ISO string, duration: seconds }]
	};

	cache.push(habit);
	write();
	return habit;
}

function remove(id) {
	const before = cache.length;
	cache = cache.filter((h) => h.id !== id);
	if (cache.length !== before) write();
	return cache.length !== before;
}

function addLog(id, duration) {
	const habit = get(id);
	if (!habit) return null;

	// Entries carry an id so the popup can attach a note to this exact session
	// after the fact. Newest first, so the new entry is always logs[0].
	habit.logs.unshift({
		id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		at: new Date().toISOString(),
		duration: Number(duration) || habit.duration,
		note: "",
	});

	write();
	return habit;
}

function setLogNote(habitId, logId, note) {
	const habit = get(habitId);
	if (!habit) return null;

	const entry = habit.logs.find((l) => l.id === logId);
	if (!entry) return null;

	entry.note = String(note || "").trim().slice(0, 500);
	write();
	return habit;
}

function markReminded(id, dayKey) {
	const habit = get(id);
	if (!habit) return;

	habit.lastReminded = dayKey;
	write();
}

function markSessionEnded(id, dayKey) {
	const habit = get(id);
	if (!habit) return;

	habit.lastSessionEnded = dayKey;
	write();
}

module.exports = { init, list, get, create, remove, addLog, setLogNote, markReminded, markSessionEnded };
