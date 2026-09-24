
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'

import path from 'path'

import {
  getProxyOptions
} from 'frappe-ui/src/utils/vite-dev-server'

import {
  webserver_port
} from '../../../sites/common_site_config.json'


export default defineConfig({

  /*
   * --------------------------------------------------
   * BASE URL
   * --------------------------------------------------
   */

  base:
    process.env.NODE_ENV === 'production'
      ? '/assets/labratory_custom_app/frontend/'
      : '/',


  /*
   * --------------------------------------------------
   * PLUGINS
   * --------------------------------------------------
   */

  plugins: [
    vue()
  ],


  /*
   * --------------------------------------------------
   * DEVELOPMENT SERVER
   * --------------------------------------------------
   */

  server: {

    port: 8080,

    proxy:
      getProxyOptions({
        port: webserver_port
      }),

  },


  /*
   * --------------------------------------------------
   * ALIAS
   * --------------------------------------------------
   */

  resolve: {

    alias: {

      '@':
        path.resolve(
          __dirname,
          'src'
        ),

    },

  },


  /*
   * --------------------------------------------------
   * BUILD
   * --------------------------------------------------
   */

 build: {
  outDir: path.resolve(
    __dirname,
    '../labratory_custom_app/public/frontend'
  ),

  emptyOutDir: true,

  target: 'es2015',

  cssCodeSplit: false,

  minify: 'esbuild',

  sourcemap: false,

  rollupOptions: {
    output: {
      format: 'iife',

      name: 'LabDashboard',

      inlineDynamicImports: true,

      entryFileNames: 'index.js',

      assetFileNames: (assetInfo) => {

        if (
          assetInfo.name &&
          assetInfo.name.endsWith('.css')
        ) {
          return 'index.css'
        }

        return 'assets/[name][extname]'
      }
    }
  }
},


  /*
   * --------------------------------------------------
   * DEPENDENCIES
   * --------------------------------------------------
   */

  optimizeDeps: {

    include: [

      'frappe-ui > feather-icons',

      'showdown',

      'engine.io-client',

      'debug',

    ],

    esbuildOptions: {

      target: 'esnext',

    },

  },

})