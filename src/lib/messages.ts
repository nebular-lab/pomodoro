// メッセージ一覧（docs/screens/messages.md）

export const MSG = {
	/** MSG-001 */
	required: (name: string) => `${name}を入力してください`,
	/** MSG-006 */
	tooLong: (name: string, max: number) =>
		`${name}は ${max} 文字以内で入力してください`,
	/** MSG-008 */
	workDone: "作業が終わりました。休憩しましょう",
	/** MSG-009 */
	breakDone: "休憩が終わりました。作業を始めましょう",
} as const;
