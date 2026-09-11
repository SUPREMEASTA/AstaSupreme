const {
    fs,
    util,
    chalk,
    moment,
    pino,
    logger,
    crypto,
    path,
    readline,
    yargs,
    _,
    Boom,
    sleep,
    store,
    rl,
    question,
    makeWASocket,
    generateWAMessageFromContent,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    useMultiFileAuthState,
    generateWAMessage,
    DisconnectReason,
    prepareWAMessageMedia,
    areJidsSameUser,
    getContentType,
    decryptPollVote,
    relayMessage,
    jidDecode,
    makeInMemoryStore,
    useSqliteAuthState,
    Browsers,
    proto
} = require('./consts.js')

let qrBool = false
let bross

if (qrBool) {
    bross = ["TsM Console", "IOS_CATALYST", "24.04.1"]
} else {
    bross = Browsers.ubuntu("safari")
}

//━━━━━━━━━By ssnowi━━━━━━━━━━━━━━━
// dont change Something is you dont know how

const NodeCache = require('node-cache')
const groupCache = new NodeCache({ stdTTL: 300, useClones: false })
const settingsPath = './setting.js'
const settings = require(settingsPath)

global.rootColor = settings.rootColor || '\x1b[31m'
global.root = settings.root || ":[ C.M.D ]: "
global.hideNumber = settings.hideNumber || false

//const qrcode = require("qrcode-terminal")
//let bross = Browsers.ubuntu("Safari")

let menuActive = false
let promptStarted = false

function startPrompt(snowi) {
    if (promptStarted) return
    promptStarted = true

    function setPrompt() {
        if (menuActive) return
        rl.setPrompt(`${global.rootColor}${global.root}`)
        rl.prompt()
    }

    setPrompt()

    rl.on('line', async input => {
        if (menuActive) return

        const command = input.trim()

        if (!command) {
            setPrompt()
            return
        }

        if (command.startsWith(',')) {
            menuActive = true
            require('./cmd.js')(command, snowi, rl, () => {
                menuActive = false
                setPrompt()
            })
            return
        }

        const jid = snowi.user.lid || snowi.user.id
        const m = {
            key: {
                remoteJid: jid,
                fromMe: true,
                id: 'INTERNAL-CMD',
            },
            sender: jid,
        }

        await snowi.makeFakeCommand(m, command)
        setPrompt()
    })
}

const dir = (relPath) => path.join(__dirname, relPath)

global.opts = new Object(
    yargs(process.argv.slice(2))
        .exitProcess(false)
        .parse()
)

async function snowiStart() {
    const { state, saveCreds } = await useSqliteAuthState('./session')

    const snowi = makeWASocket({
        logger: pino({ level: "silent" }),
        markOnlineOnConnect: true,
        auth: state,
        cachedGroupMetadata: async (jid) => groupCache.get(jid),
        emitOwnEvents: true,
        ignoreOfflineMessages: true,
      //  printQRInTerminal: qrBool,
        browser: ["Ubuntu", "Chrome", "20.0.00"],
        patchMessageBeforeSending: (msg) => {

            function self(msg) {
                /*
                const im = msg?.interactiveMessage
                || msg?.message?.interactiveMessage
                || msg?.viewOnceMessage?.message?.interactiveMessage
                || Object.values(msg || {}).find(v => v?.message?.interactiveMessage)?.message?.interactiveMessage
                */

                const im = msg?.interactiveMessage
                    || msg?.message?.interactiveMessage
                    || Object.values(msg || {}).find(v => v?.message?.interactiveMessage)?.message?.interactiveMessage

                const c = !!im?.carouselMessage?.cards?.every(i => i?.nativeFlowMessage?.buttons)

                if (!im?.nativeFlowMessage?.buttons && !c) return msg

                const obj = { name: "cta_url", buttonParamsJson: "" }

                const ctaify = but =>
                    Array.isArray(but)
                        ? but.flatMap(b =>
                            !b?.buttonParamsJson
                                ? []
                                : b?.name?.toLowerCase?.().includes("cta_url")
                                    ? [b]
                                    : [obj, b]
                        )
                        : but

                if (im?.nativeFlowMessage?.buttons)
                    im.nativeFlowMessage.buttons = ctaify(im.nativeFlowMessage.buttons)

                if (c)
                    for (const card of im.carouselMessage.cards)
                        if (Array.isArray(card.nativeFlowMessage?.buttons))
                            card.nativeFlowMessage.buttons = ctaify(card.nativeFlowMessage.buttons)

                return msg
            }

            msg = self(msg)

            const requiresVO = !!(
                msg.buttonsMessage ||
                msg.templateMessage ||
                msg.listMessage
            )

            if (requiresVO) {
                msg = {
                    viewOnceMessage: {
                        message: {
                            ...msg
                        }
                    }
                }
            }
            
const p = m => {
    const r =
      m?.botForwardedMessage?.message?.richResponseMessage ||
      m?.richResponseMessage

    if (!r) return m

    r.contextInfo = {
      ...r.contextInfo,
      isForwarded: true,
      forwardOrigin: 4
    }

    return m.botForwardedMessage
      ? m
      : { botForwardedMessage: { message: m } }
  }

  msg?.deviceSentMessage?.message
    ? (msg.deviceSentMessage.message = p(msg.deviceSentMessage.message))
    : (msg = p(msg))

            return msg
        },
        getMessage: async (key) => {
        if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id)
        return msg?.message || msg
        }
        return { conversation: "null" }
        },
        shouldSyncHistoryMessage: msg => {
            return !!msg.syncType
        },
        version: [2, 3000, 1043890899],
    }, store)

    snowi.mainPath = __dirname
    Object.assign(snowi, require('./functions.js'))

    if (!state.creds.registered && !qrBool) {
        const phoneNumber = await question('Enter number:\n')
        let code = await snowi.requestPairingCode(
            phoneNumber.replace(/[^\d]/g, ''),
            "AAAAAAAA"
        )
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(`code :`, code)
    }

    store.bind(snowi.ev)

    snowi.ev.on('messages.upsert', async chatUpdate => {
        try {
            const update = chatUpdate.messages[0]
            if (!update?.message) return

            update.message = Object.keys(update.message)[0] === 'ephemeralMessage'
                ? update.message.ephemeralMessage.message
                : update.message

            const m = { ...update }
            await require('../snowi.js')(snowi, m, chatUpdate, store)
        } catch (err) {
            console.log(err)
        }
    })

snowi.ev.on('messages.update', async chatUpdate => {
    try {
        for (const { key, update } of chatUpdate) {
            if (!update.pollUpdates) { continue }
            if (!key.fromMe) { console.log('POLL: skip (not fromMe)'); continue }
            const pollCreation = await snowi.getMessage(key)
            if (!pollCreation) continue
            const pollUpdate = await getAggregateVotesInPollMessage({
                message: pollCreation?.message?.botInvokeMessage?.message || pollCreation?.message,
                pollUpdates: update.pollUpdates,
            })         
            const selectedOptionName = pollUpdate.find(vote => vote.voters.length)?.name
//            console.log('selectedOptionName ', JSON.stringify(selectedOptionName))
            if (!selectedOptionName) continue
            const entry = snowi.tempPollStore.find(item => item.id === key.id)
            const selectedCmd = entry?.cmds.find(item => item.vote === selectedOptionName)?.cmd
            await snowi.makeFakeCommand({ key }, selectedCmd || selectedOptionName, chatUpdate)
        }
    } catch (err) { console.log('POLL ERR', err) }
})
    snowi.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            const invalidSession = [
                DisconnectReason.badSession,
                DisconnectReason.loggedOut,
                DisconnectReason.forbidden,
            ].includes(reason)

            if (invalidSession) {
                console.error('Session invalid or logged out. Pair again manually.')
                process.exit(0)
            }

            console.warn(`Connection closed (${reason}). Restarting...`)
            process.exit(1)
        } else if (connection === 'open') {

            function hidden(input) {
                if (hideNumber) {
                    return "*************"
                } else {
                    return input
                }
            }

         //   console.clear()
            centerLog(fs.readFileSync(dir('./penis.log'), 'utf-8'), chalk.green)

            console.log('\n\n')
            await sleep(1000)

            console.log(chalk.redBright('Connected to WhatsApp successfully!'))
            console.log(chalk.redBright(hidden(snowi.user.id || '👁️')))
            console.log("\n")
            console.log("You may need to send a message in whatsApp first before the internal cmd works")
            startPrompt(snowi)
        }
    })

    snowi.ev.on('creds.update', saveCreds)

    function centerLog(text, color = chalk.white) {
        const terminalWidth = process.stdout.columns || 80
        if (text.length >= terminalWidth) return console.log(color(text))
        console.log(color(' '.repeat(Math.max(0, (terminalWidth - text.length) / 2)) + text))
    }

    return snowi
}

snowiStart()
