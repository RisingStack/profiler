const fs = require('fs')
const path = require('path')

const Koa = require('koa')
const Router = require('koa-router')
const profiler = require('v8-profiler')
const thunkify = require('thunkify')
const logger = require('winston')

const app = new Koa()

const fileName = `v8-${Date.now()}.heapsnapshot`
const filePath = path.resolve(__dirname, fileName)

const router = new Router()
router.get('/snapshot', function * () {
  const snapshot = profiler.takeSnapshot()

  logger.info('Exporting snapshot...')
  const snappy = yield new Promise((resolve, reject) => {
    snapshot.export((err, snappy) => {
      if (err) {
        reject(err)
      }

      snapshot.delete()

      resolve(snappy)
    })
  })

  logger.info('Writing file...')
  yield thunkify(fs.writeFile)(filePath, snappy)

  logger.info('Stating file...')
  const stats = yield thunkify(fs.stat)(filePath)

  this.set('Last-Modified', stats.mtime.toUTCString())
  this.set('Content-Length', stats.size)
  this.set('Cache-Control', 'max-age=' + 0)
  this.set('Content-disposition', 'attachment; filename=' + fileName)
  this.type = 'heapsnapshot'
  this.body = fs.createReadStream(filePath)
})

app.use(router.routes())

app.listen(3001)
