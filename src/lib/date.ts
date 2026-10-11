// 日付と期間は、ブラウザのタイムゾーンによらず、日本時間（JST）で決める。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 日本時間の暦の日付 */
export type Ymd = { year: number; month: number; day: number };

/** その時刻の、日本時間での日付と時 */
export function toJst(time: number): Ymd & { hour: number } {
	const shifted = new Date(time + JST_OFFSET_MS);
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth() + 1,
		day: shifted.getUTCDate(),
		hour: shifted.getUTCHours(),
	};
}

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD` */
export const formatYmd = ({ year, month, day }: Ymd) =>
	`${year}-${pad(month)}-${pad(day)}`;

/** 暦の計算用に、日付を UTC の 0 時として数値にする */
const toDays = ({ year, month, day }: Ymd) => Date.UTC(year, month - 1, day);

const fromDays = (time: number): Ymd => {
	const date = new Date(time);
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
	};
};

/** `YYYY-MM-DD` の形の、実在する日付なら、その日付。そうでなければ null */
export function parseYmd(value: unknown): Ymd | null {
	if (typeof value !== "string") return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const ymd = {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
	};
	return formatYmd(fromDays(toDays(ymd))) === value ? ymd : null;
}

export const compareYmd = (a: Ymd, b: Ymd) => toDays(a) - toDays(b);

export const addDays = (ymd: Ymd, days: number): Ymd =>
	fromDays(toDays(ymd) + days * DAY_MS);

const daysInMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month, 0)).getUTCDate();

/** 月をずらす。その日がない月のときは、その月の最後の日 */
export function addMonths(ymd: Ymd, months: number): Ymd {
	const index = ymd.year * 12 + (ymd.month - 1) + months;
	const year = Math.floor(index / 12);
	const month = (index % 12) + 1;
	return { year, month, day: Math.min(ymd.day, daysInMonth(year, month)) };
}

/** 曜日（月曜を 0 とする） */
export const weekdayFromMonday = (ymd: Ymd) =>
	(new Date(toDays(ymd)).getUTCDay() + 6) % 7;

export { daysInMonth };
