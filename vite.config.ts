import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Smart caching headers that work with service worker
    headers: mode === 'development' ? {
      'Cache-Control': 'no-cache',
      'ETag': 'false'
    } : undefined,
    // SPA fallback for client-side routing
    historyApiFallback: true,
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
    // Smart cache-busting that works with service worker
    rollupOptions: {
      output: {
        // Use hash-based naming without timestamps for better caching
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: (assetInfo) => {
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `assets/[name].[hash].css`;
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp|avif)$/.test(assetInfo.name || '')) {
            return `assets/images/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        },
        // Optimized chunking for service worker cache efficiency
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs']
        },
      },
    },
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
    cssCodeSplit: true,
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
  // Preview server with coordinated caching
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': 'false'
    },
    // SPA fallback for client-side routing in preview
    historyApiFallback: true,
  }
}));
