import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { glob } from 'glob';

// Function to copy WASM files and other assets
function copyWasmPlugin() {
  return {
    name: 'copy-wasm-plugin',
    buildEnd: async () => {
      // Create directories if they don't exist
      const dirs = ['dist', 'dist/model', 'dist/assets'];
      for (const dir of dirs) {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      // Copy WASM files from onnxruntime-web
      const wasmFiles = glob.sync('node_modules/onnxruntime-web/dist/*.wasm');
      for (const file of wasmFiles) {
        const fileName = path.basename(file);
        copyFileSync(file, `dist/${fileName}`);
      }

      // Copy model directory
      const modelFiles = glob.sync('model/**/*');
      for (const file of modelFiles) {
        if (!file.endsWith('/')) {
          const destPath = `dist/${file}`;
          const destDir = path.dirname(destPath);
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
          }
          copyFileSync(file, destPath);
        }
      }

      // Copy assets directory
      const assetFiles = glob.sync('src/assets/**/*');
      for (const file of assetFiles) {
        if (!file.endsWith('/')) {
          const destPath = `dist/assets/${path.basename(file)}`;
          copyFileSync(file, destPath);
        }
      }
    }
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    copyWasmPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "process": "process/browser",
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0, // Don't inline WASM files
    sourcemap: mode === 'development' ? 'inline' : false,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'], // Exclude onnxruntime-web from dependencies optimization
  },
  // Ignore onnxruntime warnings
  // Note: Vite handles warnings differently than webpack, so this might need adjustment
}));
