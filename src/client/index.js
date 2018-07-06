import { h, render } from 'preact' // eslint-disable-line no-unused-vars

import App from './components/App'

const app = document.getElementById('app')

render(<App />, app, app.lastChild)
