const { ipcRenderer } = require("electron");

function startTimer() {
	const startButton = document.querySelector("button");
	const display = document.getElementById("timer");
	const chime = document.getElementById("chime");

	let duration = 2 * 60; // 2 minutes in seconds
	startButton.disabled = true;
	startButton.textContent = "Running...";

	const timer = setInterval(() => {
		const minutes = String(Math.floor(duration / 60)).padStart(2, "0");
		const seconds = String(duration % 60).padStart(2, "0");
		display.textContent = `${minutes}:${seconds}`;

		if (--duration < 0) {
			clearInterval(timer);

			// Play chime
			chime.play();
			ipcRenderer.send("show-popup");
			// Reset text after chime finishes (wait ~1 second for sound)
			setTimeout(() => {
				display.textContent = "02:00"; // Reset text
				startButton.disabled = false; // Enable button again
				startButton.textContent = "Start Countdown"; // Reset button text
			}, 1000);
		}
	}, 1000);
}
