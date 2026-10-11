// フェーズが終わったことを知らせる音。

/** 音の高さ（Hz）。高い音と低い音 */
const HIGH = 880;
const LOW = 587;

/** 1 音の長さ（秒）と、2 音目を鳴らし始めるまでの間（秒） */
const TONE_SECONDS = 0.6;
const TONE_GAP_SECONDS = 0.25;

/**
 * 短いチャイムを 1 回鳴らす。鳴らせない環境では、何もしない。
 * 作業が終わったときは、高い音から低い音へ下がる 2 音。休憩が終わったときは、低い音から高い音へ上がる 2 音
 */
export function playChime(finished: "work" | "break") {
	try {
		const AudioContextClass =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext;
		if (!AudioContextClass) return;
		const context = new AudioContextClass();
		const tones = finished === "work" ? [HIGH, LOW] : [LOW, HIGH];
		tones.forEach((frequency, index) => {
			const startAt = context.currentTime + index * TONE_GAP_SECONDS;
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.type = "sine";
			oscillator.frequency.value = frequency;
			gain.gain.setValueAtTime(0.2, startAt);
			gain.gain.exponentialRampToValueAtTime(0.001, startAt + TONE_SECONDS);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(startAt);
			oscillator.stop(startAt + TONE_SECONDS);
			if (index === tones.length - 1) {
				oscillator.onended = () => {
					void context.close();
				};
			}
		});
	} catch {
		// 音を鳴らせなくても、タイマーは進める
	}
}
