import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:4000',
      '/runners': 'http://localhost:4000',
      '/selections': 'http://localhost:4000',
      '/me': 'http://localhost:4000',
      '/leaderboard': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/races': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: path => path,
      },
    },
  },
});