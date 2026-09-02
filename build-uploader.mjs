import * as esbuild from 'esbuild';
import dotenv from 'dotenv';
const env = dotenv.config().parsed || {};

const define = {};
for (const k in env) {
  define[`import.meta.env.${k}`] = JSON.stringify(env[k]);
}

await esbuild.build({
  entryPoints: ['js/uploader-mount.jsx'],
  bundle: true,
  outfile: 'js/uploader-bundle.js',
  define: define,
  loader: { '.jsx': 'jsx' },
});
console.log("Built uploader-bundle.js");
