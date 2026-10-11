// メッセージ一覧（docs/screens/messages.md）

export const MSG = {
	/** MSG-001 */
	required: (name: string) => `${name}を入力してください`,
	/** MSG-006 */
	tooLong: (name: string, max: number) =>
		`${name}は ${max} 文字以内で入力してください`,
} as const;
