const express = require('express')
const path = require('path')

const app = express()

const port = process.env.PORT || 8080
const host = '0.0.0.0'

const distPath = path.join(__dirname, 'dist')

app.use(express.static(distPath))

// Catch-all middleware for SPA routing (works in all Express versions)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(port, host, () => {
  console.log(`Frontend listening on http://${host}:${port}`)
})

