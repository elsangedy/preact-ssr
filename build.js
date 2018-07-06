const rollup = require('rollup').rollup
const json = require('rollup-plugin-json')
const buble = require('rollup-plugin-buble')
const uglify = require('rollup-plugin-uglify').uglify
const replace = require('rollup-plugin-replace')
const commonjs = require('rollup-plugin-commonjs')
const optimizeJs = require('rollup-plugin-optimize-js')
const nodeResolve = require('rollup-plugin-node-resolve')
const fs = require('fs-extra-promise')
const purifycss = require('purify-css')
const sass = require('node-sass').render
const cssnano = require('cssnano').process
const nodeRev = require('node-rev').default
const swPrecache = require('sw-precache').write

const { name, dependencies } = require('./package')

const server = () => rollup({
  input: './src/server/index.js',
  external: Object.keys(dependencies).concat(['fs']),
  plugins: [
    replace({ '__CLIENT__': false }),
    json(),
    commonjs({ include: ['node_modules/**/*'] }),
    buble({ jsx: 'h', objectAssign: 'Object.assign' })
  ]
}).then(bundle => bundle.write({ file: './build/index.js', format: 'cjs', sourcemap: true }))

const client = () => rollup({
  input: './src/client/index.js',
  context: 'window',
  plugins: [
    nodeResolve({ jsnext: true, browser: true }),
    commonjs({ include: ['node_modules/**/*'] }),
    replace({ '__CLIENT__': true, 'process.env.NODE_ENV': JSON.stringify('production') }),
    buble({ jsx: 'h', objectAssign: 'Object.assign' }),
    uglify({
      compress: {
        negate_iife: false,
        unsafe_comps: true,
        properties: true,
        keep_fargs: false,
        pure_getters: true,
        collapse_vars: true,
        unsafe: true,
        warnings: false,
        sequences: true,
        dead_code: true,
        drop_debugger: true,
        comparisons: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        if_return: true,
        join_vars: true,
        drop_console: true,
        pure_funcs: [
          'classCallCheck',
          'invariant',
          'warning'
        ]
      },
      output: {
        comments: false
      }
    }),
    optimizeJs()
  ]
}).then(bundle => bundle.write({ file: './build/public/bundle.js', format: 'iife', sourcemap: true }))

const css = () => new Promise((resolve, reject) => sass({ file: './src/client/styles/index.scss' }, (err, result) => err ? reject(err) : resolve(result)))
  .then(({ css }) => purifycss(['./src/client/components/**/*.js'], css.toString()))
  .then((purified) => cssnano(purified, { autoprefixer: { add: true }, from: undefined }))
  .then(({ css }) => fs.outputFileAsync('./build/public/bundle.css', css))

const sw = () => swPrecache('./build/public/sw.js', {
  cacheId: `${name}`,
  directoryIndex: '/',
  staticFileGlobs: [
    '/',
    './build/public/manifest-*.json',
    './build/public/*.{gif,png,svg}'
  ],
  navigateFallback: '/',
  dynamicUrlToDependencies: {
    '/': ['./src/server/routes/root.js', './build/public/bundle.css', './build/public/bundle.js', './build/public/manifest.json', './package.json'] // bust cache when these change
  },
  skipWaiting: true,
  stripPrefix: './build/public',
  runtimeCaching: [{
    urlPattern: /\/posts/, // handle remote api call
    handler: 'cacheFirst'
  }]
})

const rev = () => Promise.resolve(nodeRev({
  files: './build/public/**/*.*',
  outputDir: './build/public/',
  file: './build/public/assets.json',
  hash: true
}))

const clean = () => fs.emptyDirAsync('./build')

const copy = () => fs.copyAsync('./src/client/static/', './build/public/')

const tasks = new Map()

const run = (task) => {
  const start = new Date()

  return tasks.get(task)().then(
    () => console.log('\x1b[36m%s\x1b[0m', '[build]', `'${task}' done in ${new Date().getTime() - start.getTime()}ms`),
    (err) => console.error('\x1b[31m%s\x1b[0m', '[build]', `error running '${task}':`, err.stack)
  )
}

tasks
  .set('clean', clean)
  .set('client', client)
  .set('css', css)
  .set('copy', copy)
  .set('rev', rev)
  .set('server', server)
  .set('sw', sw)
  .set('build', () => run('clean')
    .then(() => Promise.all([run('client'), run('css'), run('copy'), run('server')]))
    .then(() => run('rev'))
    .then(() => run('sw'))
  )

run(/^\w/.test(process.argv[2] || '') ? process.argv[2] : 'build')
