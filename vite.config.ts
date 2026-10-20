import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative Pfade ("./"), damit die App auch in der Android-APK (Capacitor) läuft.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  server: {
    host: true, // im WLAN erreichbar (für Tests mit dem Handy)
    port: 5173,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
