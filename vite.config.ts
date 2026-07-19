import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const legacyPlugins = legacy({
    targets: ['chrome >= 49', 'android >= 5', 'defaults', 'not IE 11'],
    additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
  });

  // Patch the legacy plugins to prevent the TypeError in configResolved due to 'this' being undefined
  const patchedLegacyPlugins = (Array.isArray(legacyPlugins) ? legacyPlugins : [legacyPlugins]).map((plugin: any) => {
    if (plugin && plugin.configResolved) {
      const originalConfigResolved = plugin.configResolved;
      plugin.configResolved = function (config: any) {
        const context = this || { meta: { viteVersion: '6.0.0' } };
        if (!context.meta) {
          context.meta = { viteVersion: '6.0.0' };
        }
        return originalConfigResolved.call(context, config);
      };
    }
    return plugin;
  });

  return {
    plugins: [
      react(), 
      tailwindcss(),
      ...patchedLegacyPlugins,
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
