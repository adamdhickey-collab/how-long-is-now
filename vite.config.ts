import { defineConfig } from 'vite';

// base './' so the build works at any path — GitHub Pages project
// sites serve from /how-long-is-now/, local preview serves from /.
export default defineConfig({
  base: './',
});
