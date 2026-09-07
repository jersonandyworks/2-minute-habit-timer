// Shown when a session finishes, when a habit reminder fires, and when a
// session window closes. The finished-session variant also collects a note.

let target = null; // { habitId, logId } — only set for a finished session

window.api.onPopupData((data) => {
	const { kind, title, message, note, quote } = data;

	target = kind === "done" ? data.target : null;

	document.getElementById("title").textContent = title;
	document.getElementById("habit").textContent = message || "";
	document.getElementById("note").textContent = note || "";
	document.getElementById("quote").textContent = quote ? quote.text : "";
	document.getElementById("by").textContent = quote && quote.by ? `— ${quote.by}` : "";

	const field = document.getElementById("notefield");
	const notes = document.getElementById("notes");

	field.hidden = !target;
	notes.value = "";

	const label = { reminder: "Got it", "session-end": "Done for today" }[kind] || (target ? "Save & close" : "Close");
	document.getElementById("close").textContent = label;

	if (target) notes.focus();
});

// Whatever is typed is saved on the way out — there is no separate save button
// to forget about.
async function finish() {
	const notes = document.getElementById("notes");

	if (target && notes.value.trim()) {
		await window.api.saveLogNote(target.habitId, target.logId, notes.value);
	}

	window.api.closePopup();
}

document.getElementById("close").addEventListener("click", finish);

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") return finish();

	// Enter submits, unless the caret is in the note field where it means newline.
	const typing = document.activeElement === document.getElementById("notes");
	if (e.key === "Enter" && (!typing || e.ctrlKey || e.metaKey)) finish();
});
