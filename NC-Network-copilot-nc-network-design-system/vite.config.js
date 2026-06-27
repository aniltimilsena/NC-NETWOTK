import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

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

export default defineConfig({
  plugins: [react(), generateVersionJson()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
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
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  }
})

