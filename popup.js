// Shown when a session finishes, and when a habit reminder fires.

window.api.onPopupData(({ kind, title, message, note, quote }) => {
	document.getElementById("title").textContent = title;
	document.getElementById("habit").textContent = message || "";
	document.getElementById("note").textContent = note || "";
	document.getElementById("quote").textContent = quote ? quote.text : "";
	document.getElementById("by").textContent = quote && quote.by ? `— ${quote.by}` : "";
	const label = { reminder: "Got it", "session-end": "Done for today" }[kind] || "Close";
	document.getElementById("close").textContent = label;

});

document.getElementById("close").addEventListener("click", () => window.api.closePopup());

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" || e.key === "Enter") window.api.closePopup();
});
