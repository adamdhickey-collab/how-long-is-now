import { defineConfig } from 'vite';

// base './' so the build works at any path — GitHub Pages project
// sites serve from /how-long-is-now/, local preview serves from /.
export default defineConfig({
  base: './',
  // Every plate URL carries the build's id, so a browser that cached a
  // plate under the same name reads the new one after a deploy.
  define: {
    __BUILD__: JSON.stringify(Date.now().toString(36)),
  },
});
