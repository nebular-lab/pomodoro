# 画面設計の概要

このディレクトリには、画面の設計書と、それに関わるファイルを置いている。画面ごと・共通ヘッダーごとのファイル（ワイヤーフレーム、設計書、Playwright テスト）は、それぞれの ID のフォルダの中にある。

| ファイル | 内容 |
| --- | --- |
| [messages.md](messages.md) | メッセージ一覧。全画面で共通のメッセージ ID と文言 |
| [common-rules.md](common-rules.md) | 共通ルール。全画面で同じになる扱い（入力、react-hook-form と TanStack Query の設定など） |
| [wireframe.css](wireframe.css) | ワイヤーフレームの共通スタイル |
| [openapi.yaml](../api/openapi.yaml) | タスク・作業記録・設定の API 定義（OpenAPI）。手で書く |
| [auth-openapi.json](../api/auth-openapi.json) | ログインまわりの API 定義（OpenAPI）。Better Auth から `pnpm api:export` で書き出す。パスは `/api/auth` からの相対 |

## 共通ヘッダー

複数の画面で使うヘッダー。種類ごとに、画面と同じ形でワイヤーフレームと設計書を作る。どの画面がどのヘッダーを使うかは、下の画面一覧の「共通ヘッダー」に書く。

| ヘッダー ID | ヘッダー名 | ワイヤーフレーム | 設計書 | Playwright テスト |
| --- | --- | --- | --- | --- |
| HDR-001 | ログイン後のヘッダー | [HDR-001_app-header.html](HDR-001_app-header/HDR-001_app-header.html) | [HDR-001_app-header.md](HDR-001_app-header/HDR-001_app-header.md) | - |

## 画面一覧

| 画面 ID | 画面名 | URL | 共通ヘッダー | ワイヤーフレーム | 設計書 | Playwright テスト |
| --- | --- | --- | --- | --- | --- | --- |
| SCR-001 | ログイン | /login | - | [SCR-001_login.html](SCR-001_login/SCR-001_login.html) | [SCR-001_login.md](SCR-001_login/SCR-001_login.md) | - |
| SCR-002 | タイマー | / | HDR-001 | [SCR-002_timer.html](SCR-002_timer/SCR-002_timer.html) | [SCR-002_timer.md](SCR-002_timer/SCR-002_timer.md) | - |
| SCR-003 | タスク管理 | /tasks | HDR-001 | [SCR-003_tasks.html](SCR-003_tasks/SCR-003_tasks.html) | [SCR-003_tasks.md](SCR-003_tasks/SCR-003_tasks.md) | - |
| SCR-004 | 履歴 | /history | HDR-001 | [SCR-004_history.html](SCR-004_history/SCR-004_history.html) | [SCR-004_history.md](SCR-004_history/SCR-004_history.md) | - |
| SCR-005 | 設定 | /settings | HDR-001 | [SCR-005_settings.html](SCR-005_settings/SCR-005_settings.html) | [SCR-005_settings.md](SCR-005_settings/SCR-005_settings.md) | - |
