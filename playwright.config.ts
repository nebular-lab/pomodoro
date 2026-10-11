import { defineConfig } from '@playwright/test'

// 画面設計書（docs/screens/）と同じフォルダに置いた、画面ごとのテストを実行する
export default defineConfig({
  testDir: './docs/screens',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
