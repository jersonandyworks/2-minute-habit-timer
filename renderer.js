/* 2-Minute Habit Timer — renderer.
   Three views in one window: home, create, habit. All data goes through
   window.api (see preload.js). */

const $ = (id) => document.getElementById(id);

const DAY_LABELS = {
	daily: "Daily",
	mon: "Mon",
	tue: "Tue",
	wed: "Wed",
	thu: "Thu",
	fri: "Fri",
	sat: "Sat",
	sun: "Sun",
};

const ARC_LENGTH = 452; // matches stroke-dasharray on #home-arc

let habits = [];
let currentId = null;
let session = null; // { habitId, total, remaining, ticker }
let chosenIcon = DEFAULT_ICON;

// Habits created before the icon picker have no icon; give those a stable one
// from their position so a list doesn't look like one repeated row.
function iconFor(habit, index) {
	if (habit.icon && ICONS[habit.icon]) return ICONS[habit.icon];
	return ICONS[ICON_KEYS[index % ICON_KEYS.length]];
}

/* ───────────── helpers ───────────── */

function clock(seconds) {
	const m = String(Math.floor(seconds / 60)).padStart(2, "0");
	const s = String(seconds % 60).padStart(2, "0");
	return `${m}:${s}`;
}

function shortClock(seconds) {
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

// "September 7, 2026 @ 1:06pm"
function formatStamp(iso) {
	const d = new Date(iso);
	const hours = d.getHours();
	const suffix = hours >= 12 ? "pm" : "am";
	const hour12 = hours % 12 === 0 ? 12 : hours % 12;

	return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} @ ${hour12}:${String(d.getMinutes()).padStart(2, "0")}${suffix}`;
}

function dayKey(date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Consecutive days with at least one log, counting back from today
// (or from yesterday, so an unfinished today doesn't zero the streak).
function streakOf(habit) {
	if (!habit.logs.length) return 0;

	const days = new Set(habit.logs.map((l) => dayKey(new Date(l.at))));
	const cursor = new Date();

	if (!days.has(dayKey(cursor))) {
		cursor.setDate(cursor.getDate() - 1);
		if (!days.has(dayKey(cursor))) return 0;
	}

	let count = 0;
	while (days.has(dayKey(cursor))) {
		count++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return count;
}

function parseClock(time) {
	const [h, m] = time.split(":").map(Number);
	return { h, m, suffix: h >= 12 ? "PM" : "AM", hour12: h % 12 === 0 ? 12 : h % 12 };
}

// "3 – 5 PM" when both sit on the hour in the same half of the day,
// "3:30 AM – 5:15 PM" otherwise.
function windowLabel(startTime, endTime) {
	const start = parseClock(startTime);
	const end = parseClock(endTime);
	const onTheHour = start.m === 0 && end.m === 0;

	if (onTheHour && start.suffix === end.suffix) return `${start.hour12}–${end.hour12} ${end.suffix}`;
	if (onTheHour) return `${start.hour12} ${start.suffix} – ${end.hour12} ${end.suffix}`;

	const left = `${start.hour12}:${String(start.m).padStart(2, "0")} ${start.suffix}`;
	const right = `${end.hour12}:${String(end.m).padStart(2, "0")} ${end.suffix}`;
	return `${left} – ${right}`;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function minutesOf(time) {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

function appliesToday(habit) {
	return habit.reminderDay === "daily" || habit.reminderDay === DAY_KEYS[new Date().getDay()];
}

// Where the clock sits relative to today's session window:
//   "none"   no window, or the habit isn't scheduled today — never locked
//   "before" the window hasn't opened yet
//   "open"   inside the window, the only time a session can start
//   "closed" the window has passed for today
function sessionState(habit) {
	if (!habit.sessionStart || !habit.sessionEnd) return "none";
	if (!appliesToday(habit)) return "none";

	const now = new Date();
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	const start = minutesOf(habit.sessionStart);
	const end = minutesOf(habit.sessionEnd);

	if (start > end) {
		// Window crosses midnight. Outside it, the next thing to happen is the
		// window opening again, so that reads as "before" rather than "closed".
		return nowMinutes >= start || nowMinutes < end ? "open" : "before";
	}

	if (nowMinutes < start) return "before";
	if (nowMinutes >= end) return "closed";
	return "open";
}

function clockLabel(time) {
	const { hour12, m, suffix } = parseClock(time);
	return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function reminderLabel(habit) {
	if (!habit.reminderStart || !habit.reminderEnd) return `${Math.round(habit.duration / 60)} min · no reminder`;

	const day = DAY_LABELS[habit.reminderDay] || "Daily";
	return `${day} · ${windowLabel(habit.reminderStart, habit.reminderEnd)}`;
}

function escapeHtml(text) {
	return String(text).replace(/[&<>"']/g, (ch) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
	});
}

function show(viewId) {
	document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === viewId));
}

/* ───────────── home ───────────── */

function greeting() {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 18) return "Good afternoon";
	return "Good evening";
}

function renderHome() {
	$("greeting").textContent = greeting();

	const list = $("habit-list");

	if (!habits.length) {
		list.innerHTML = `
			<div class="empty">
				<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
					<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
				</svg>
				<p>No habits yet.<br />Create one and give it two minutes.</p>
			</div>`;
		$("home-sub").textContent = "Two minutes is all it takes.";
		return;
	}

	$("home-sub").textContent = `${habits.length} habit${habits.length === 1 ? "" : "s"} · keep the chain going.`;

	list.innerHTML = habits
		.map((habit, i) => {
			const streak = streakOf(habit);
			return `
				<button class="card" data-id="${habit.id}">
					<span class="dot">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							${iconFor(habit, i)}
						</svg>
					</span>
					<span class="txt">
						<b>${escapeHtml(habit.name)}</b>
						<span>${escapeHtml(reminderLabel(habit))}</span>
					</span>
					<span class="streak">${streak}d</span>
				</button>`;
		})
		.join("");

	list.querySelectorAll(".card").forEach((card) => {
		card.addEventListener("click", () => openHabit(card.dataset.id));
	});
}

// The home dial mirrors whatever session is running, if any.
function renderDial() {
	const total = session ? session.total : 120;
	const remaining = session ? session.remaining : total;

	$("home-time").textContent = clock(remaining);
	$("home-state").textContent = session ? "Focusing" : "Ready";
	$("home-arc").setAttribute("stroke-dashoffset", session ? ARC_LENGTH * (1 - remaining / total) : ARC_LENGTH);
}

/* ───────────── habit view ───────────── */

function openHabit(id) {
	currentId = id;
	renderHabit();
	show("view-habit");
}

function renderHabit() {
	const habit = habits.find((h) => h.id === currentId);
	if (!habit) return show("view-home");

	$("h-name").textContent = habit.name;
	$("h-desc").textContent = habit.description || reminderLabel(habit);
	updateStartButton(habit);

	const log = $("habit-log");
	log.innerHTML = habit.logs.length
		? habit.logs
				.map(
					(entry, i) => `
					<div class="li">
						<div class="row">
							<i>
								<span class="tick">
									<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</span>
								Session ${habit.logs.length - i}
							</i>
							<span>${formatStamp(entry.at)}</span>
						</div>
						${entry.note ? `<p class="note">${escapeHtml(entry.note)}</p>` : ""}
					</div>`
				)
				.join("")
		: '<div class="none">No sessions logged yet.</div>';
}

// Start button, session chip and cancel link — everything that changes as the
// clock moves. Split out so the gate ticker can refresh it without redrawing
// the history log underneath.
function updateStartButton(habit) {
	const running = session && session.habitId === habit.id;
	const state = running ? "open" : sessionState(habit);
	const locked = state === "before" || state === "closed";
	const start = $("btn-start");

	start.classList.toggle("running", Boolean(running));
	start.classList.toggle("locked", locked);
	start.disabled = Boolean(session) || locked;

	$("btn-start-label").textContent = running
		? `${clock(session.remaining)} remaining`
		: state === "before"
			? `Opens at ${clockLabel(habit.sessionStart)}`
			: state === "closed"
				? "Session window closed"
				: `Start Now · ${shortClock(habit.duration)}`;

	$("btn-stop").hidden = !running;

	const chip = $("h-meta");
	chip.textContent = habit.sessionStart && habit.sessionEnd
		? `Session ${windowLabel(habit.sessionStart, habit.sessionEnd)}`
		: "";
	chip.classList.toggle("closed", locked);

	const trade = $("h-work");
	trade.textContent = workTypeLabel(habit.workType);
}

/* ───────────── session timer ───────────── */

function startSession() {
	const habit = habits.find((h) => h.id === currentId);
	if (!habit || session) return;

	const state = sessionState(habit);
	if (state === "before" || state === "closed") return renderHabit();

	session = { habitId: habit.id, total: habit.duration, remaining: habit.duration, ticker: null };
	session.ticker = setInterval(tick, 1000);

	renderHabit();
	renderDial();
}

function tick() {
	session.remaining--;

	if (session.remaining <= 0) return finishSession();

	$("btn-start-label").textContent = `${clock(session.remaining)} remaining`;
	renderDial();
}

async function finishSession() {
	const { habitId, total } = session;

	clearInterval(session.ticker);
	session = null;

	$("chime").play().catch(() => {}); // autoplay can be refused; the popup still fires

	const updated = await window.api.completeSession(habitId, total);
	if (updated) habits = habits.map((h) => (h.id === updated.id ? updated : h));

	renderHome();
	renderDial();
	if (currentId === habitId) renderHabit();
}

function stopSession() {
	if (!session) return;

	clearInterval(session.ticker);
	session = null;

	renderDial();
	renderHabit();
}

/* ───────────── work type ───────────── */

let workTypes = [];

async function loadWorkTypes() {
	workTypes = await window.api.listWorkTypes();

	$("f-worktype").innerHTML = workTypes
		.map((t) => `<option value="${t.value}">${escapeHtml(t.label)}</option>`)
		.join("");
}

function workTypeLabel(value) {
	const match = workTypes.find((t) => t.value === value);
	return match && match.value ? match.label : "";
}

/* ───────────── icon picker ───────────── */

function renderIconGrid() {
	$("f-icons").innerHTML = ICON_KEYS.map(
		(key) => `
			<button type="button" class="icontile" role="radio" data-icon="${key}"
				aria-checked="${key === chosenIcon}" aria-label="${key}" title="${key}">
				<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					${ICONS[key]}
				</svg>
				<span class="check">
					<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
				</span>
			</button>`
	).join("");

	$("f-icons").querySelectorAll(".icontile").forEach((tile) => {
		tile.addEventListener("click", () => selectIcon(tile.dataset.icon));
	});
}

function selectIcon(key) {
	chosenIcon = key;

	$("f-icons").querySelectorAll(".icontile").forEach((tile) => {
		tile.setAttribute("aria-checked", String(tile.dataset.icon === key));
	});
}

/* ───────────── create ───────────── */

function openCreate() {
	$("f-name").value = "";
	$("f-desc").value = "";
	$("f-start").value = "15:00";
	$("f-end").value = "17:00";
	$("f-day").value = "mon";
	$("f-session-start").value = "13:00";
	$("f-session-end").value = "14:00";
	$("f-duration").value = "120";
	$("f-worktype").value = "";
	$("f-error").textContent = "";

	chosenIcon = DEFAULT_ICON;
	renderIconGrid();

	show("view-create");
	$("f-name").focus();
}

// Both a reminder window and a session window need the same two checks.
function validateWindow(startId, endId, label) {
	const start = $(startId).value;
	const end = $(endId).value;

	if (Boolean(start) !== Boolean(end)) {
		$(start ? endId : startId).focus();
		return `Set both ends of the ${label}, or neither.`;
	}

	if (start && start === end) {
		$(endId).focus();
		return `The ${label} needs to be longer than that.`;
	}

	return "";
}

async function saveHabit() {
	const name = $("f-name").value.trim();

	if (!name) {
		$("f-error").textContent = "Give the habit a name first.";
		$("f-name").focus();
		return;
	}

	const problem =
		validateWindow("f-start", "f-end", "reminder window") ||
		validateWindow("f-session-start", "f-session-end", "session duration");

	if (problem) {
		$("f-error").textContent = problem;
		return;
	}

	$("f-error").textContent = "";

	const habit = await window.api.createHabit({
		name,
		description: $("f-desc").value.trim(),
		icon: chosenIcon,
		workType: $("f-worktype").value,
		reminderStart: $("f-start").value,
		reminderEnd: $("f-end").value,
		reminderDay: $("f-day").value,
		sessionStart: $("f-session-start").value,
		sessionEnd: $("f-session-end").value,
		duration: Number($("f-duration").value),
	});

	habits.push(habit);
	renderHome();
	openHabit(habit.id);
}

/* ───────────── delete ───────────── */

function askDelete() {
	$("confirm").classList.add("open");
}

async function confirmDelete() {
	$("confirm").classList.remove("open");

	if (session && session.habitId === currentId) stopSession();

	await window.api.deleteHabit(currentId);
	habits = habits.filter((h) => h.id !== currentId);
	currentId = null;

	renderHome();
	show("view-home");
}

/* ───────────── boot ───────────── */

async function refresh() {
	habits = await window.api.listHabits();
	renderHome();
	if (currentId) renderHabit();
}

function wire() {
	$("btn-new").addEventListener("click", openCreate);
	$("btn-cancel").addEventListener("click", () => show("view-home"));
	$("btn-create-back").addEventListener("click", () => show("view-home"));
	$("btn-save").addEventListener("click", saveHabit);

	$("btn-habit-back").addEventListener("click", () => {
		currentId = null;
		show("view-home");
	});

	$("btn-start").addEventListener("click", startSession);
	$("btn-stop").addEventListener("click", stopSession);

	$("btn-delete").addEventListener("click", askDelete);
	$("btn-confirm-no").addEventListener("click", () => $("confirm").classList.remove("open"));
	$("btn-confirm-yes").addEventListener("click", confirmDelete);

	$("f-name").addEventListener("keydown", (e) => {
		if (e.key === "Enter") saveHabit();
	});

	window.api.onHabitsChanged(refresh);
	loadWorkTypes();

	// The window can close while the habit is on screen; re-check every 15s.
	setInterval(() => {
		if (!currentId || session) return;

		const habit = habits.find((h) => h.id === currentId);
		if (habit) updateStartButton(habit);
	}, 15000);
}

wire();
renderDial();
refresh();
