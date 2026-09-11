const { spawn } = require('child_process')

let bot
let stopping = false

function startBot() {
    bot = spawn('node', ['./dev/index.js'], { stdio: 'inherit' })

    bot.on('exit', (code, signal) => {
        if (stopping || signal || code === 0) return
        setTimeout(startBot, 1500)
    })
}

function stop(signal) {
    stopping = true
    bot?.kill(signal)
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))

startBot()
