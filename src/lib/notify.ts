// フェーズが終わったことを知らせる、音とブラウザ通知。

/** 短いチャイムを 1 回鳴らす。鳴らせない環境では、何もしない */
export function playChime() {
	try {
		const AudioContextClass =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext;
		if (!AudioContextClass) return;
		const context = new AudioContextClass();
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = 880;
		gain.gain.setValueAtTime(0.2, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start();
		oscillator.stop(context.currentTime + 1);
		oscillator.onended = () => {
			void context.close();
		};
	} catch {
		// 音を鳴らせなくても、タイマーは進める
	}
}

/** ブラウザ通知が許可されているときだけ、通知を出す */
export function showNotification(message: string) {
	if (typeof Notification === "undefined") return;
	if (Notification.permission !== "granted") return;
	try {
		new Notification(message);
	} catch {
		// 通知を出せなくても、タイマーは進める
	}
}

/** ブラウザ通知を、まだ許可も拒否もしていないとき、許可を求める（答えは待たない） */
export function requestNotificationPermission() {
	if (typeof Notification === "undefined") return;
	if (Notification.permission !== "default") return;
	try {
		void Notification.requestPermission();
	} catch {
		// 求められなくても、タイマーは進める
	}
}
