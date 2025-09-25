import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Disable caching in development
    headers: mode === 'development' ? {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    } : undefined,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Aggressive cache-busting and performance optimization
    rollupOptions: {
      output: {
        // Hash all files with timestamps for maximum cache-busting
        entryFileNames: `assets/[name].[hash].${Date.now()}.js`,
        chunkFileNames: `assets/[name].[hash].${Date.now()}.js`,
        assetFileNames: (assetInfo) => {
          const timestamp = Date.now();
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `assets/[name].[hash].${timestamp}.css`;
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp|avif)$/.test(assetInfo.name || '')) {
            return `assets/images/[name].[hash].${timestamp}[extname]`;
          }
          return `assets/[name].[hash].${timestamp}[extname]`;
        },
        // Manual chunking for better caching strategies
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs']
        },
      },
    },
    // Performance optimizations
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
    // Enable code splitting
    cssCodeSplit: true,
    // Improve build speed
    reportCompressedSize: false,
  },
  // Enhanced performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react',
      'clsx'
    ],
    // Force dependency re-bundling on changes
    force: mode === 'development',
  },
  // Asset handling with better compression
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  // Preview server optimizations
  preview: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
}));
