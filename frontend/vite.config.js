import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read the shared .env from the repo root.
  envDir: '..',
  server: { port: 5173 },
});
