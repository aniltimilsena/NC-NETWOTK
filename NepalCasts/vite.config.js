import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildVersion = Date.now().toString()

// A simple plugin to write version.json to the build output
function generateVersionJson() {
  return {
    name: 'generate-version-json',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')
      const versionFilePath = path.join(outDir, 'version.json')
      const data = JSON.stringify({ version: buildVersion })
      
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }
      fs.writeFileSync(versionFilePath, data)
      console.log(`✓ Generated version.json: ${data}`)
    }
  }
}

// Auto-spawn Express backend on port 5000 during dev if not already running
function autoBackendPlugin() {
  let serverProcess = null
  return {
    name: 'auto-backend-server',
    configureServer(server) {
      const checkReq = http.get('http://localhost:5000/api/health', () => {})
      checkReq.on('error', () => {
        console.log('⚡ [vite] Spawning backend Express API on port 5000...')
        const isWin = process.platform === 'win32'
        const cmd = isWin ? 'npm.cmd' : 'npm'
        serverProcess = spawn(cmd, ['run', 'dev'], {
          cwd: path.resolve(__dirname, 'server'),
          stdio: 'inherit',
          shell: true,
        })
      })
      const cleanUp = () => {
        if (serverProcess) {
          try { serverProcess.kill() } catch (_) {}
          serverProcess = null
        }
      }
      process.on('exit', cleanUp)
      process.on('SIGINT', cleanUp)
      process.on('SIGTERM', cleanUp)
    }
  }
}

export default defineConfig({
  plugins: [react(), generateVersionJson(), autoBackendPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ['react', 'react-dom'],
  },

  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/__/auth': {
        target: 'https://nc-network-10d0b.firebaseapp.com',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  build: {
    sourcemap: false,
    minify: 'oxc',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normId = id.replace(/\\/g, '/');
          if (normId.includes('@firebase/firestore') || normId.includes('firebase/firestore')) {
            return 'vendor-firebase-firestore';
          }
          if (normId.includes('@firebase/storage') || normId.includes('firebase/storage')) {
            return 'vendor-firebase-storage';
          }
          if (normId.includes('@firebase/auth') || normId.includes('firebase/auth')) {
            return 'vendor-firebase-auth';
          }
          if (normId.includes('firebase')) {
            return 'vendor-firebase-core';
          }
          if (normId.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide';
          }
          if (normId.includes('node_modules/react/') || normId.includes('node_modules/react-dom/') || normId.includes('node_modules/react-router') || normId.includes('node_modules/react-helmet-async/')) {
            return 'vendor-react';
          }
          if (normId.includes('node_modules/@clerk/')) {
            return 'vendor-clerk';
          }
          if (normId.includes('node_modules/framer-motion/')) {
            return 'vendor-framer';
          }
          if (normId.includes('node_modules/react-onesignal/') || normId.includes('node_modules/onesignal/')) {
            return 'vendor-onesignal';
          }
          if (normId.includes('node_modules/i18next/') || normId.includes('node_modules/react-i18next/')) {
            return 'vendor-i18n';
          }
          if (normId.includes('node_modules/axios/')) {
            return 'vendor-axios';
          }
          if (normId.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          if (normId.includes('node_modules/tailwind-merge/') || normId.includes('node_modules/clsx/')) {
            return 'vendor-utils';
          }
          if (normId.includes('node_modules/browser-image-compression/')) {
            return 'vendor-compression';
          }
        }
      }
    }
  }
})

