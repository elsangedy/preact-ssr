import { h } from 'preact' // eslint-disable-line no-unused-vars
import render from 'preact-render-to-string'

import { Router } from 'express'
import { readFileSync } from 'fs'

import App from '../../client/components/App'

const assets = JSON.parse(readFileSync(`${__dirname}/public/assets.json`))
const manifestUrl = `/${assets['manifest.json']}`
const faviconUrl = `/${assets['icons/icon-192x192.png']}`
const inlineJs = readFileSync(`${__dirname}/public/${assets['bundle.js']}`)
const inlineCss = readFileSync(`${__dirname}/public/${assets['bundle.css']}`)

const AppShell = ({ html }) => `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <script>if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }</script>
    <title>Preact SSR</title>
    <meta name="description" content="Preact Server Side Render">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#673ab8">
    <link rel="manifest" href="${manifestUrl}">
    <link rel="dns-prefetch" href="https://jsonplaceholder.typicode.com">
    <link rel="shortcut icon" type="image/x-icon" href="${faviconUrl}">
    <style>${inlineCss}</style>
  </head>
  <body>
    <div id="app">${html}</div>
    <script>${inlineJs}</script>
  </body>
</html>`

const createAppShell = () => {
  const html = render(<App />)

  return AppShell({ html })
}

export default Router().get('/', (req, res) => {
  res.send(createAppShell())
})
