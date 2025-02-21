import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Specific polyfills
      include: ['os', 'util', 'path', 'process'],
      // Whether to polyfill specific globals
      globals: {
        process: true,
      },
    }),
  ],
});