# 2-Minute Habit Timer

**A simple, distraction-free timer to help you focus on one task for two minutes.**

## 📌 About

Inspired by the *Atomic Habits* **Two-Minute Rule**, this app encourages deep focus by allowing users to work on **just one task** for two uninterrupted minutes—no distractions, no multitasking, just pure concentration.

## 🚀 Features

- ⏳ **Two-minute focus timer**—press start and focus. 5, 10 and 15 minute options too.
- 📋 **Multiple habits**—create as many as you like, each with its own duration.
- 🔔 **Alarm reminder windows**—"3 PM to 5 PM on Monday"; one nudge once you're inside the window.
- 🗓 **Session duration**—the slot the habit lives in (say 1 PM to 2 PM). Start Now only works inside it,
  and when it closes a popup tells you how you did.
- 📖 **History log**—every finished session is recorded, with a running day streak.
- 🧰 **Type of work**—pick your trade (coding, SEO, copywriting, design, video, data, AI and more).
- 💬 **A quote at the finish line**—a chime, a popup, and a line from your own trade: 20 per work type.
- 🎨 **Pick an icon**—twelve to choose from, so habits are recognisable at a glance.
- 💾 **Saved locally**—habits persist between runs, no account, no cloud.

## 🎯 Why Two Minutes?

The *Two-Minute Habit* concept states that the easiest way to build a habit is to start small. By committing just **two minutes**, you eliminate procrastination and activate momentum, making it easier to sustain productive habits over time.

## 📖 How to Use

1. **Create a habit**—name it, describe it, set a reminder window, a session duration and a focus timer.
2. **Open it and press Start Now**—focus **only** on that task.
3. Avoid switching tasks or distractions—fully engage until the chime.
4. The session lands in your **history log**. Come back tomorrow and keep the streak.

## 🔧 Installation

```sh
git clone https://github.com/your-username/2-minute-habit-timer.git
cd 2-minute-habit-timer
npm install
npm start
```

On Linux you may need `npx electron . --no-sandbox` instead of `npm start`.

## 🛠 Building an installer

```sh
npm run dist    # NSIS installer for Windows
npm run pack    # unpacked build, no installer
```

## 🗂 Project layout

| File | Role |
| --- | --- |
| `main.js` | Electron main process, windows, reminders, IPC |
| `preload.js` | The only bridge to the renderer (`window.api`) |
| `store.js` | Habit persistence — `habits.json` in the user data folder |
| `index.html` / `renderer.js` | Home, Create Habit and Habit View screens |
| `popup.html` / `popup.js` | Session-finished and reminder popup |
| `styles.css` | Design system ("Soft Aqua") |
| `quotes.js` | The quote collection |
| `design.html` | The three design directions this UI was picked from |

## 🎨 Palette

`#F2FCFE` · `#96E6F5` · `#57D9F1` · `#01C9EE`
