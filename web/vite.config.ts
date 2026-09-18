import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 相対パスにしておくと、GitHub Pages のサブディレクトリでもそのまま動く
  base: './',
})
