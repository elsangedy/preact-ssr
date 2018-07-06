import express from 'express'
import shrinkRay from 'shrink-ray'

import { root } from './routes'

import { serveStatic, cacheControl, strictTransportSecurity } from './middleware'

const app = express()
app.disable('x-powered-by')
app.use(shrinkRay())
app.use(strictTransportSecurity())
app.use(serveStatic())
app.use(cacheControl())
app.use('/*', root)

export default app
