// require("electron-reload")(__dirname, {
// 	electron: require(`${__dirname}/node_modules/electron`),
// });

const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

const quotes = [
	"Small habits, big results—start tiny and stay consistent.",
	"Every action casts a vote for the person you want to become.",
	"The secret to productivity is making good habits effortless.",
	"Focus on systems, not goals—progress is in the process.",
	"You don’t rise to the level of your goals, you fall to the level of your habits.",
	"Tiny improvements, compounded daily, lead to massive success.",
	"The most productive people are not the busiest, but the most intentional.",
	"Success is built in the quiet moments of small, repeated effort.",
	"Make it easy, make it obvious—habit formation starts with simplicity.",
	"Don’t break the chain—show up, even if just for two minutes.",
	"Your productivity is a reflection of the habits you cultivate.",
	"It's not about doing more, but about doing better—refine your habits.",
	"Win the morning, win the day—set the tone with intentional habits.",
	"The best way to be productive tomorrow is to build better habits today.",
	"Motivation is fleeting, but habits keep you moving forward.",
	"Design your environment for success—shape habits by shaping your surroundings.",
	"Turn distractions into triggers for good habits, not procrastination.",
	"Make habits rewarding, and productivity will feel effortless.",
	"Small actions today create the momentum for massive achievements tomorrow.",
	"Habit stacking turns small wins into unstoppable success.",
	"The smallest habits shape the biggest successes.",
	"You don’t need motivation, you need consistency.",
	"Success is a series of small, smart choices repeated daily.",
	"Your future is determined by the habits you practice today.",
	"Identity shapes behavior—act like the person you want to become.",
	"Each habit is a vote for the future you.",
	"Make it easy, make it obvious, make it repeatable.",
	"The best way to change your life is to change your habits.",
	"Little habits lead to extraordinary transformations.",
	"Small changes, big impact—every tiny habit matters.",
	"Your habits determine your trajectory, not your goals.",
	"Success isn’t about intensity; it’s about consistency.",
	"Start small and let momentum do the rest.",
	"Productivity thrives on structure and simplicity.",
	"Good habits are the foundation of lasting progress.",
	"Make habits attractive, and discipline becomes effortless.",
	"The secret to success? Repetition with purpose.",
	"Your daily routine predicts your future achievements.",
	"The habit loop: cue, routine, reward—master it.",
	"A 1% improvement daily compounds into massive results.",
	"Every tiny choice shapes the person you’re becoming.",
	"Start today with just two minutes—it’s all you need.",
	"Environment shapes behavior—design yours for success.",
	"Want better results? Start by improving your habits.",
	"The most effective habits are the easiest to repeat.",
	"Small wins fuel motivation—celebrate every success.",
	"Make success inevitable by making good habits automatic.",
	"Building habits isn’t about willpower, it’s about strategy.",
	"Don’t break the streak—show up every day.",
	"The key to productivity is making good habits effortless.",
	"Simplicity is the gateway to consistency.",
	"Stack good habits and watch your productivity skyrocket.",
	"Every action moves you closer or further from your goals.",
	"Show up daily—even small efforts compound over time.",
	"Automate success by turning good actions into habits.",
	"The best time to start was yesterday—the second best is now.",
	"Your habits should work for you, not against you.",
	"A habit is only as strong as the system that supports it.",
	"Motivation fades, but habits stay.",
	"Success isn’t about luck—it’s about habits.",
	"What you do daily matters more than what you do occasionally.",
	"Master the first two minutes—momentum will follow.",
	"Your habits should align with the person you aspire to be.",
	"Action over perfection—just start.",
	"Tiny adjustments can lead to massive breakthroughs.",
	"Success is built in the small, unseen moments.",
	"Self-control is easier when your habits are automatic.",
	"You can’t build a skyscraper without a solid foundation.",
	"It’s not about doing more, it’s about doing better.",
	"Set systems, not just goals—habits create progress.",
	"Your outcomes are the natural results of your habits.",
	"The hardest part is starting—the easiest part is continuing.",
	"Small shifts create big momentum.",
	"Consistency beats intensity every time.",
	"Tiny improvements today lead to major results tomorrow.",
	"Success is not about perfection, it’s about persistence.",
	"Your time is better spent refining habits than chasing motivation.",
	"Every habit you build today shapes your future self.",
	"Break bad habits by making them unattractive.",
	"Success is the result of well-crafted habits, not luck.",
	"Train your brain to make good choices effortlessly.",
	"Design your environment to support your best self.",
	"Make productivity easy by eliminating friction.",
	"Never underestimate the power of small daily actions.",
	"Habits shape your destiny—choose them wisely.",
	"Sustainable habits lead to sustainable success.",
	"Decide the identity you want and act accordingly.",
	"The quality of your habits determines the quality of your life.",
	"Build momentum with tiny wins, and success will follow.",
	"Replace bad habits with better ones that serve your goals.",
	"The key to mastery? Repetition, patience, and persistence.",
	"Your environment can make or break your habits—choose wisely.",
	"Design your life with systems that make good habits inevitable.",
	"A habit well-formed is harder to break than a bad habit.",
	"Win the small battles, and you’ll win the war.",
	"Good habits don’t require effort when designed strategically.",
	"Productivity starts with clarity—know what matters most.",
	"You become what you consistently do.",
	"Stack habits to amplify success.",
	"The fastest way to succeed is to master your habits.",
	"The goal is progress, not perfection.",
	"The right habits help you work smarter, not harder.",
	"Every action contributes to the identity you create.",
	"Small steps, repeated daily, lead to life-changing results.",
	"Make habits simple, make success inevitable.",
	"Never let perfect be the enemy of progress.",
	"Build discipline by mastering your smallest habits.",
	"Let your habits work for you, not against you.",
	"Start small, aim high, stay consistent.",
	"Better habits lead to better results—it's that simple.",
	"You don’t need to be perfect, just consistent.",
	"Focus on getting 1% better every day.",
	"Tiny daily victories lead to long-term success.",
	"Create habits that make success effortless.",
	"A strong habit system beats short bursts of effort.",
	"Your habits should make success feel natural, not forced.",
	"Master the fundamentals, and everything else falls into place.",
	"Turn inspiration into action—habits make the difference.",
	"The best way to predict your future is to build better habits today.",
	"Habits decide success—choose wisely.",
	"Great copy isn’t written, it’s assembled—follow a proven formula.",
	"Copywriting is salesmanship in print—persuade, don’t just inform.",
	"People don’t buy products, they buy solutions to their problems.",
	"The best headlines stop people in their tracks—make them irresistible.",
	"If you can clearly define the problem, people will see you as the solution.",
	"Writing great copy is about connecting emotionally first, logically second.",
	"Your copy should be a conversation, not a lecture.",
	"The secret to selling? Understand what keeps your audience up at night.",
	"Benefits sell, features explain—focus on transformation.",
	"Every word in your copy should serve a purpose—no fluff allowed.",
	"Make your offer too good to refuse—stack value like crazy.",
	"Speak your audience’s language, not industry jargon.",
	"Great copy turns browsers into buyers with the right emotional triggers.",
	"Always answer the silent question: 'Why should I care?'",
	"People buy based on emotion and justify with logic—appeal to both.",
	"Your headline is 80% of the battle—make it impossible to ignore.",
	"Write like you’re talking to a friend, not a stranger.",
	"Scarcity and urgency make people act—use them wisely.",
	"Stories sell—facts tell, but emotions persuade.",
	"The best copy makes people feel understood before it asks them to buy.",
	"Clarity is king—confusing copy never converts.",
	"Make it about them, not about you.",
	"Good copy answers objections before they arise.",
	"A confused mind never buys—simplify your message.",
	"Your audience must see themselves in your story.",
	"The most powerful word in marketing is 'you.'",
	"The right copy turns hesitation into action.",
	"People don’t read ads, they read solutions to their problems.",
	"Make your copy feel personal—like a private conversation.",
	"The goal of copywriting is to make saying yes effortless.",
	"If you want engagement, make your copy compelling.",
	"A strong call-to-action turns readers into customers.",
	"People buy results, not products.",
	"Sell the experience, not just the item.",
	"The best copy eliminates fear and builds trust.",
	"A great copywriter understands psychology better than grammar.",
	"If it doesn’t spark curiosity, it won’t convert.",
	"Copy should guide the reader, not overwhelm them.",
	"The first sentence must hook, the last must sell.",
	"The more specific your copy, the more persuasive it becomes.",
	"Never assume people know—explain it like they don’t.",
	"Make it easy for people to say yes.",
	"Your copy should make people feel, not just think.",
	"Emotional triggers are the foundation of great persuasion.",
	"The best copy feels natural, not forced.",
	"Your offer should be obvious—don’t make them guess.",
	"If your headline doesn’t grab attention, nothing else matters.",
	"Copywriting is about influence, not just information.",
	"You’re not selling a product, you’re selling a transformation.",
	"Powerful copy creates desire, not just interest.",
];

let popupWindow = null;

function createWindow() {
	const win = new BrowserWindow({
		width: 400,
		height: 280,
		icon: path.join(__dirname, "build/icon.ico"),
		alwaysOnTop: true,
		autoHideMenuBar: true,
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	Menu.setApplicationMenu(null);
	win.loadFile("index.html");
}

function createPopup() {
	const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

	// Prevent multiple popups
	if (popupWindow) return;

	popupWindow = new BrowserWindow({
		width: 450,
		height: 320,
		icon: path.join(__dirname, "build/icon.ico"),
		alwaysOnTop: true,
		frame: true,
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	popupWindow.loadFile("popup.html");

	// When the popup is ready, send the quote
	popupWindow.webContents.on("did-finish-load", () => {
		popupWindow.webContents.send("quote", randomQuote);
	});

	// Cleanup when closed
	popupWindow.on("closed", () => {
		popupWindow = null;
	});
}

app.whenReady().then(createWindow);

ipcMain.on("show-popup", () => {
	createPopup();
});

ipcMain.on("close-popup", () => {
	if (popupWindow) {
		popupWindow.close();
		popupWindow = null;
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
