const DEFAULT_DELAY = 1000
const country = "de-DE" //You can change this to your country format to change to the right time 
/*

notes: 

isSecret: true means only the targets main device will recive the message (no selfcrash and anti steal)

protected: true means you and the target can see the message but its anti steal

participant: {jid: jid} is already known as anti self crash


all of these only work in pn, groups are not included
*/


const {
    generateWAMessageFromContent,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    encodeSignedDeviceIdentity,
    makeCacheableSignalKeyStore,
    prepareWAMessageMedia,
    downloadMediaMessage,
    useMultiFileAuthState,
    generateMessageIDV2,
    makeInMemoryStore,
    generateWAMessage,
    generateMessageID,
    encodeWAMessage,
    PHONENUMBER_MCC,
    DisconnectReason,
    getBusinessProfile,
    getContentType,
    makeWASocket,
    msgRetryCounterCache,
    areJidsSameUser,
    decryptPollVote,
    hmacSign,
    aesEncryptGCM,
    relayMessage,
    jidDecode,
    jidEncode,
    authState,
    Browsers,
    crypto_1,
    Utils_1,
    WABinary_1,
    WAProto_1,
    fetchLatestversion,
    WAProto,
    getDevice,
    proto,
} = require("@vansnowi/baileys")

const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const moment = require('moment-timezone')
const pino = require('pino')
const logger = pino({ level: 'debug' })
const crypto = require('crypto')
const path = require('path')
const timeRn = Math.floor(Date.now() / 1000)
const { log } = require('./dev/consts.js')

module.exports = async (snowi, m, chatUpdate, store) => {
    try {
        let x = {}
        x.id = m.key.id
        x.isBaileys = x.id.startsWith('BAE5') && x.id.length === 16
        x.chat = m.key.remoteJid
        x.fromMe = m.key.fromMe
        x.isGroup = x.chat.endsWith('@g.us')

        if ((m.key?.participant?.endsWith("@lid")) & (m.key?.participant === snowi.user.lid)) {
            x.sender = snowi.user.lid
        } else {
            x.sender = snowi.decodeJid(x.fromMe && snowi.user.id || x.participant || m.key.participant || x.chat || '')
        }

        if (x.isGroup) x.participant = snowi.decodeJid(m.key.participant) || ''

        function getTypeM(message) {
            const type = Object.keys(message)
            var restype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1] || Object.keys(message)[0]
            return restype
        }

        x.mtype = getTypeM(m.message)
        x.msg = (x.mtype == 'viewOnceMessage' ? m.message[x.mtype].message[getTypeM(m.message[x.mtype].message)] : m.message[x.mtype])
        x.text = x?.msg?.text || x?.msg?.caption || m?.message?.conversation || x?.msg?.contentText || x?.msg?.selectedDisplayText || x?.msg?.title || ''

        const info = {
            key: m.key,
            message: m.message,
            //id: m.id,
            //isBaileys: m.isBaileys,
            //chat: m.chat,
            //fromMe: m.fromMe,
            //isGroup: x.isGroup,
            //sender: m.sender,
            //participant: m.participant || '',
            //mtype: x.mtype,
            //text: m.text
        }

        const from = info.key.remoteJid

        const ASTA_IMG = path.join(__dirname, 'atsa', 'menu.jpg') //
        const ASTA_AUDIO = path.join(__dirname, 'atsa', 'menu.mp3')
        const sendMenuAudio = () => snowi.sendMessage(
            from,
            { audio: fs.readFileSync(ASTA_AUDIO), mimetype: 'audio/mp4', ptt: false }
        ).catch(e => console.log(util.format(e)))

        let interactiveId = ''
        if (x.mtype === 'interactiveResponseMessage') {
            try {
                interactiveId = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id || ''
            } catch {}
        }

        var body = (x.mtype === 'interactiveResponseMessage')
            ? interactiveId
            : (x.mtype === 'conversation')
                ? m.message.conversation
                : (x.mtype === 'deviceSentMessage')
                    ? m.message.extendedTextMessage.text
                    : (x.mtype == 'imageMessage')
                        ? m.message.imageMessage.caption
                        : (x.mtype == 'videoMessage')
                            ? m.message.videoMessage.caption
                            : (x.mtype == 'extendedTextMessage')
                                ? m.message.extendedTextMessage.text
                                : (x.mtype == 'buttonsResponseMessage')
                                    ? m.message.buttonsResponseMessage.selectedButtonId
                                    : (x.mtype == 'listResponseMessage')
                                        ? m.message.listResponseMessage.singleSelectReply.selectedRowId
                                        : (x.mtype == 'templateButtonReplyMessage')
                                            ? m.message.templateButtonReplyMessage.selectedId
                                            : (x.mtype == 'messageContextInfo')
                                                ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || x.text)
                                                : ""

        const getGroupAdmins = (participants) => {
            let admins = []
            for (let i of participants) {
                i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : ''
            }
            return admins || []
        }

        const sleep = async (ms) => {
            return new Promise(resolve => setTimeout(resolve, ms))
        }

        const quotedMsg = info?.message?.extendedTextMessage?.contextInfo?.quotedMessage || { "conversation": "no quoted" }
        var budy = (typeof x.text == 'string' ? x.text : '')

        const bardy = body || ''
        const isInternal = info.key.id === 'INTERNAL-CMD'
        const prefix = [',', '.', ''].find(value => bardy.startsWith(value)) || ''
        const isCmd = isInternal || bardy.length > 0
        const commandBody = isInternal ? bardy : bardy.slice(prefix.length)
        const command = isCmd ? commandBody.trim().split(' ').shift().toLowerCase() : ''
        const args = commandBody.trim().split(/ +/).slice(1)
        const text = args.join(" ")
        const q = args.join(" ")
        const sender = info.key.fromMe ? (snowi.user.id.split(':')[0] + '@s.whatsapp.net' || snowi.user.id) : (info.key.participant || info.key.remoteJid)
        const botNumber = await snowi.decodeJid(snowi.user.id)
        const senderNumber = sender.split('@')[0]

        const userList = [
            "1@s.whatsapp.net",
        ]

        global.prefixx = [",", ".", ""]
        const isCreator = userList.includes(sender)
        const pushname = m.pushName || `${senderNumber}`
        const isBot = info.key.fromMe ? true : false
        m.sender = x.sender
        const groupMetadata = x.isGroup ? await snowi.groupMetadata(from).catch(e => { }) : ''
        const groupName = x.isGroup ? groupMetadata?.subject : ''
        const participants = x.isGroup ? groupMetadata.participants : ''
        const groupAdmins = x.isGroup ? await getGroupAdmins(participants) : ''
        const isBotAdmins = x.isGroup ? groupAdmins.includes(botNumber) : false
        const isAdmins = x.isGroup ? groupAdmins.includes(m.sender) : false
        var deviceC = info.key.id.length > 21 ? 'Android' : info.key.id.substring(0, 2) == '3A' ? 'IPhone' : 'WhatsApp web'

        const messageType = Object.keys(info.message)[0]
        const mentionxs = info.message[messageType]?.contextInfo?.mentionedJid
        const settingsPath = './dev/setting.js'
        const settings = require(settingsPath)
        const server = ["@s.whatsapp.net", "@lid", "@broadcast", "@bot", "@g.us" ]
        const aiJid = "13135550002" + server[0]
        const aiId = "867051314767696" + server[3]
        const meJid = snowi.user.id.split(":")[0] + server[0]
        const meLid = snowi.user.lid.split(":")[0] + server[1]
        const sJid = "status" + server[2]

        const reply = (text) => snowi.sendMessage(
            from,
            { text: text, mentions: [sender] },
            { quoted: m }
        ).catch(() => {})

        var deviceC = info.key.id.length > 21 ? 'Android' : info.key.id.substring(0, 2) == '3A' ? 'IPhone' : 'WhatsApp web'

        async function getMessage(key) {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg
            }
            return {
                conversation: "fjews"
            }
        }

        //const prettier = require("prettier");

        //DEV

        function updateSettings(settingKey, value) {
            const settings = require(settingsPath)
            settings[settingKey] = value
            fs.writeFileSync(settingsPath, `module.exports = ${JSON.stringify(settings, null, 2)};`, 'utf8')
            global[settingKey] = value
        }

        function hidden(input) {
            if (hideNumber) {
                return "*************"
            } else {
                return input
            }
        }

        let date = new Date(info.messageTimestamp * 1000)
        let options = {
            timeZone: 'Europe/Berlin',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }

        if (totallog) {
            if (m.message && x.isGroup) {
                if (!grplog) {

                } else {
                    const tOo = new Date().toLocaleTimeString(country, {
                        hour: "2-digit",
                        minute: "2-digit"
                    })

                    const title = 'Group Chat'
                    const INFOS = [
                        `[ MESSAGE ] ${tOo}`,
                        `=> Text: ${bardy}`,
                        `=> Name: ${hidden(pushname || "unknown")}`,
                        `=> From: ${hidden(sender)}`,
                        `=> In: ${groupName || info.chat}`,
                        `=> Device: ${deviceC}`,
                    ]
                    log(INFOS, title)
                }
            } else {
                const tOo = new Date().toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit"
                })

                const title = 'Private Chat'
                const INFOS = [
                    `[ MESSAGE ] ${tOo}`,
                    `=> Text: ${bardy}`,
                    `=> Name: ${hidden(pushname || "unknown")}`,
                    `=> From: ${hidden(sender)}`,
                    `=> Device: ${deviceC}`,
                ]
                log(INFOS, title)
            }
        }



switch(command) {

case "aonc": {
if (!isBot) return reply("no bot")
let ahoi = info?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
if (!ahoi) return reply("reply to a view once message")
    if (ahoi?.videoMessage?.viewOnce) {
        ahoi.videoMessage.viewOnce = false;
    }

    if (ahoi?.imageMessage?.viewOnce) {
        ahoi.imageMessage.viewOnce = false;
    }

    if (ahoi?.audioMessage?.viewOnce) {
        ahoi.audioMessage.viewOnce = false;
    }
    snowi.relayMessage(from, ahoi, {});
} break

case "menu": {
if (!isBot) return
await snowi.richMenu(from, {
header: {
    disclaimer: true,
    disclaimerText: "AstaTech",
    title: "Menu"
    },
    body: {
    carousel: true,
    cards: [
        {
        title: "🕹️ Games",
        buttons: [
            "chess",
            "story",
            "flappy"
        ],
        toast: "Asta"
        },
        {
        title: "🎧 Sound",
        buttons: [
            "acid",
            "beat",
            "games"
        ],
        toast: "Asta"
        },
        {
        title: "🧰 Tools",
        buttons: [
            "calc",
            "bmi",
            "tools"
        ],
        toast: "Asta"
        },
        {
        title: "🎉 Fun",
        buttons: [
            "arcade",
            "riddle",
            "fun"
        ],
        toast: "Asta"
        },
    ]
    },
    footer: {
    text: "AstaTech"
    },
    contextInfo: {
    quotedMessage: {
        "stickerPackMessage": {
    "name": "A. Painter 88",
        }
    },
    remoteJid: "status@broadcast",
    participant: aiJid,
    }
})
await sendMenuAudio()
} break

case "asta": {
if (!isBot) return
await snowi.richMenu(from, {
header: {
    disclaimer: true,
    disclaimerText: "AstaTech",
    title: "Asta"
    },
    body: {
    row: true,
    cards: [
        {
        title: "Games",
        buttons: [
            "chess",
            "story",
            "flappy",
            "games"
        ],
        toast: "Asta"
        },
        {
        title: "Sound & Fun",
        buttons: [
            "acid",
            "beat",
            "arcade",
            "fun"
        ],
        toast: "Asta"
        },
        {
        title: "Tools",
        buttons: [
            "calc",
            "bmi",
            "password",
            "tools"
        ],
        toast: "Asta"
        },
    ]
    },
    footer: {
    text: "AstaTech"
    },
    contextInfo: {
    isForwarded: true,
    forwardOrigin: 4
    }
})
await sendMenuAudio()
} break

case "bot": {
if (!isBot) return
await snowi.richMenu(from, {
    header: {
    disclaimer: true,
    disclaimerText: "AstaTech",
    title: "Asta Menu"
    },
    body: {
    carousel: false,
    title: "All commands",
    buttons: [
        "chess",
        "story",
        "acid",
        "beat",
        "flappy",
        "arcade",
        "calc",
        "bmi",
        "quote",
        "riddle",
        "games",
        "tools",
        "fun"
    ],
    toast: "Asta"
    },
    footer: {
    text: "AstaTech"
    },
    contextInfo: {
    "quotedMessage": {
        "stickerPackMessage": {
    "name": "A. Painter 88",
        }
    },
    "remoteJid": "status@broadcast",
    "participant": aiJid,
    }
})
await sendMenuAudio()
} break

case "menu3": {
if (!isBot) return
snowi.pollMenu(from, `Asta Menu`, [
    { vote: "🕹️ Games", cmd: `games` },
    { vote: "🎮 Arcade", cmd: `arcade` },
    { vote: "🧰 Tools", cmd: `tools` },
    { vote: "🎉 Fun", cmd: `fun` },
    { vote: "♟️ Chess", cmd: `chess` },
    { vote: "📖 Story", cmd: `story` },
    
], {
    "quotedMessage": {
        "stickerPackMessage": {
    "name": "A. Painter 88",
        }
    },
    "remoteJid": "status@broadcast",
    "participant": aiJid,
//    "mentionedJid": [""]
})
await sendMenuAudio()
} break

case "menu2": {
if (!isBot) return
const asta_img_media = await prepareWAMessageMedia(
    { image: { url: ASTA_IMG } },
    { upload: snowi.waUploadToServer }
)
snowi.sendjson(from, {
"viewOnceMessage": {
"message": {
"buttonsMessage": {
    ...asta_img_media,
    "headerType": 4,
    "text": "Asta",
    "contentText": "Pick a command",
    "buttons": [
    {
        "buttonId": "1",
        "buttonText": {
    "displayText": "By AstaTech"
        },
        "type": 1
    },
    {
        "buttonId": "2",
        "buttonText": {
    "displayText": "By AstaTech"
        },
        "type": 1,
    "nativeFlowInfo": {
    "name": "single_select",
    "paramsJson": JSON.stringify({
        "title": "Asta Menu",
        "sections": [
            {
        "title": "GAMES",
        "rows": [
        {
            "title": "Chess",
            "description": "Play chess against the AI",
            "id": "chess",
        },
        {
            "title": "Story",
            "description": "Pick a mood and read a story",
            "id": "story",
        },
        {
            "title": "Acid 303",
            "description": "Loud acid bassline sequencer",
            "id": "acid",
        },
        {
            "title": "Beat Pad",
            "description": "Tap-drum performance pads",
            "id": "beat",
        },
        {
            "title": "Flappy Bat",
            "description": "Relaxed flap-to-fly game",
            "id": "flappy",
        },
        {
            "title": "All games",
            "description": "See every game with details",
            "id": "games",
        },
        ]
            },
            {
        "title": "TOOLS",
        "rows": [
        {
            "title": "Calculator",
            "description": "Solve a math expression",
            "id": "calc",
        },
        {
            "title": "BMI",
            "description": "Check your BMI",
            "id": "bmi",
        },
        {
            "title": "Password Generator",
            "description": "Generate a random password",
            "id": "password",
        },
        {
            "title": "UUID Generator",
            "description": "Generate a random UUID",
            "id": "uuid",
        },
        {
            "title": "Pick / Shuffle",
            "description": "Pick or shuffle a list of options",
            "id": "pick",
        },
        {
            "title": "All tools",
            "description": "See every tool with details",
            "id": "tools",
        },
        ]
            },
            {
        "title": "FUN",
        "rows": [
        {
            "title": "Arcade",
            "description": "Animated coin flip, dice, RPS",
            "id": "arcade",
        },
        {
            "title": "Quote",
            "description": "Get a random quote",
            "id": "quote",
        },
        {
            "title": "Fact",
            "description": "Get a random fun fact",
            "id": "fact",
        },
        {
            "title": "Truth or Dare",
            "description": "Classic truth or dare prompts",
            "id": "truth",
        },
        {
            "title": "Riddle",
            "description": "Solve a riddle, reply with .answer",
            "id": "riddle",
        },
        {
            "title": "All fun",
            "description": "See every fun command with details",
            "id": "fun",
        },
        ]
            }
        ]
    })
    }
    },
    ],
}
}}
},{})
await sendMenuAudio()
} break

case 'test': {
snowi.relayMessage(from, {
"conversation": "blabla"
}, {
    isSecret: true
})
}
break

case "me": {
if (!isBot) return
reply(meJid)
} break

case "from": {
if (!isBot) return
reply(from)
} break

case "ping": {
if (!isBot) return
const speed = require("performance-now")
const timestamp = speed();
const latens = speed() - timestamp
reply(`*${latens.toFixed(4)}*`)
} break

case "restart": {
if (!isBot) return
await reply("restarting")
process.exit(1)
} break

case "info": {
if (!isBot) return
await reply(JSON.stringify(quotedMsg, null, 4))
process.exit(1)
} break

case "beat": {
if (!isBot) return
try {
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Beat Pad</title>
<style>
:root{
  --bg:#08070b;
  --line:rgba(255,255,255,.09);
  --text:#fff;
  --muted:#aaa1ae;
  --gold:#ffd700;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;padding:0;background:radial-gradient(circle at top,#1a0a0a 0%,#0b080d 45%,#050407 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden;}
body{min-height:100vh;padding:12px;}
.app{width:min(100%,700px);margin:auto;}
.header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
.brand{display:flex;align-items:center;gap:10px;}
.avatar{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid var(--gold);box-shadow:0 8px 25px rgba(255,215,0,.22);font-size:21px;}
.title{font-size:17px;font-weight:800;color:var(--gold);}
.subtitle{color:var(--muted);font-size:10px;margin-top:2px;}
.controls{display:flex;gap:8px;margin-bottom:10px;}
.btn{flex:1;min-height:40px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.045);color:#fff;font-size:12px;font-weight:700;cursor:pointer;}
.btn:active{transform:scale(.96);}
.btn.rec{border-color:#ff426c;color:#ff426c;}
.btn.rec.active{background:#ff426c;color:#fff;box-shadow:0 0 14px rgba(255,66,108,.5);}
.btn.primary{border-color:var(--gold);color:var(--gold);}
.btn.primary.active{background:var(--gold);color:#08070b;box-shadow:0 0 14px rgba(255,215,0,.5);}
.stage{
  position:relative;
  width:100%;
  aspect-ratio:1/1.15;
  border-radius:20px;
  overflow:hidden;
  background:radial-gradient(circle at 50% 30%,rgba(255,215,0,.04),transparent 70%);
  border:1px solid var(--line);
}
canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}
.pads{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:10px;padding:14px;}
.pad{
  position:relative;
  border-radius:50%;
  border:2px solid rgba(255,255,255,.15);
  background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.08),rgba(255,255,255,.02));
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:11px;
  font-weight:800;
  color:var(--muted);
  cursor:pointer;
  transition:transform .05s;
}
.pad:active{transform:scale(.92);}
.pad.flash{border-color:var(--gold);box-shadow:0 0 30px rgba(255,215,0,.4);}
.message{margin-top:10px;padding:9px 13px;border-radius:12px;background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.14);text-align:center;color:#ffed4a;font-size:11px;}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="brand">
      <div class="avatar">🥁</div>
      <div>
        <div class="title">Beat Pad</div>
        <div class="subtitle">Tap harder = louder & bigger</div>
      </div>
    </div>
  </div>

  <div class="controls">
    <button class="btn rec" id="recBtn">⏺️ Record</button>
    <button class="btn primary" id="loopBtn">🔁 Loop</button>
    <button class="btn" id="clearBtn">🗑️ Clear</button>
  </div>

  <div class="stage">
    <canvas id="fx"></canvas>
    <div class="pads" id="pads"></div>
  </div>

  <div class="message" id="message">Tap the pads to play. Hold Record to capture a take 🥁</div>
</div>

<script>
'use strict';
const PADS = [
  {name:'Kick', color:'255,120,90'},
  {name:'Snare', color:'255,215,0'},
  {name:'HiHat', color:'120,220,255'},
  {name:'Clap', color:'200,120,255'},
  {name:'Tom', color:'120,255,170'},
  {name:'Cymbal', color:'255,255,255'}
];

let audioCtx = null;
function initAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}

function noiseBuffer(duration){
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
  return buffer;
}

function playKick(vel){
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now+0.15);
  gain.gain.setValueAtTime(vel, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now+0.3);
  osc.start(now); osc.stop(now+0.3);
}
function playSnare(vel){
  const now = audioCtx.currentTime;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(0.2);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 1000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vel*0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now+0.15);
  noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now+0.2);
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle'; osc.frequency.value = 180;
  oscGain.gain.setValueAtTime(vel*0.5, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now+0.1);
  osc.connect(oscGain); oscGain.connect(audioCtx.destination);
  osc.start(now); osc.stop(now+0.1);
}
function playHiHat(vel){
  const now = audioCtx.currentTime;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(0.08);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 7000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vel*0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now+0.06);
  noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now+0.08);
}
function playClap(vel){
  const now = audioCtx.currentTime;
  for(let i=0;i<3;i++){
    const t = now + i*0.015;
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer(0.1);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1500;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vel*0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t+0.08);
    noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    noise.start(t); noise.stop(t+0.1);
  }
}
function playTom(vel){
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(90, now+0.25);
  gain.gain.setValueAtTime(vel*0.85, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now+0.35);
  osc.start(now); osc.stop(now+0.35);
}
function playCymbal(vel){
  const now = audioCtx.currentTime;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer(0.6);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 5000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vel*0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now+0.5);
  noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  noise.start(now); noise.stop(now+0.6);
}

const SOUND_FN = [playKick, playSnare, playHiHat, playClap, playTom, playCymbal];

// ─── Particle physics stage ──────────────────────────────────
const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
let particles = [];
let dpr = window.devicePixelRatio || 1;

function resize(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resize);

function spawnBurst(x, y, color, vel){
  const count = Math.round(6 + vel*14);
  for(let i=0;i<count;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = (0.6 + Math.random()*2.2) * (0.5 + vel);
    particles.push({
      x, y,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      r: (2 + Math.random()*3) * (0.6 + vel),
      life: 1,
      decay: 0.012 + Math.random()*0.01,
      color
    });
  }
  particles.push({
    x, y, vx:0, vy:0,
    r: 4, ring:true, maxR: 40 + vel*60,
    life: 1, decay: 0.03, color
  });
}

function stepParticles(){
  ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
  particles = particles.filter(p => p.life > 0);
  for(const p of particles){
    p.life -= p.decay;
    if(p.ring){
      const r = p.maxR * (1-p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba('+p.color+','+(p.life*0.6)+')';
      ctx.lineWidth = 2;
      ctx.stroke();
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03;
    p.vx *= 0.98;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
    ctx.fillStyle = 'rgba('+p.color+','+p.life+')';
    ctx.fill();
  }
  requestAnimationFrame(stepParticles);
}

// ─── Pads ──────────────────────────────────────────────────
const padsEl = document.getElementById('pads');
const padTouchStart = {};

PADS.forEach((pad, idx)=>{
  const el = document.createElement('div');
  el.className = 'pad';
  el.textContent = pad.name;
  el.dataset.idx = idx;
  padsEl.appendChild(el);
});

function hitPad(idx, vel){
  initAudio();
  SOUND_FN[idx](vel);
  const el = padsEl.children[idx];
  el.classList.add('flash');
  setTimeout(()=>el.classList.remove('flash'), 120);
  const rect = el.getBoundingClientRect();
  const stageRect = canvas.getBoundingClientRect();
  const x = rect.left - stageRect.left + rect.width/2;
  const y = rect.top - stageRect.top + rect.height/2;
  spawnBurst(x, y, PADS[idx].color, vel);
  if(recording){
    recordedEvents.push({ t: performance.now() - recordStart, idx, vel });
  }
}

Array.from(padsEl.children).forEach((el, idx)=>{
  el.addEventListener('pointerdown', e=>{
    e.preventDefault();
    padTouchStart[idx] = performance.now();
    // e.pressure is 0-1 on devices that report real touch pressure (some Android).
    // Most phones/webviews report 0 or a flat 0.5 — in that case fall back to a
    // fixed strong hit instead of pretending we have velocity we don't.
    const vel = (e.pressure && e.pressure > 0 && e.pressure !== 0.5) ? Math.min(1, 0.4 + e.pressure) : 0.9;
    hitPad(idx, vel);
  });
});

// ─── Record / Loop ────────────────────────────────────────
let recording = false;
let recordStart = 0;
let recordedEvents = [];
let looping = false;
let loopTimeouts = [];
let loopDuration = 0;

const recBtn = document.getElementById('recBtn');
const loopBtn = document.getElementById('loopBtn');
const clearBtn = document.getElementById('clearBtn');
const messageEl = document.getElementById('message');

recBtn.addEventListener('click', ()=>{
  if(!recording){
    recording = true;
    recordedEvents = [];
    recordStart = performance.now();
    recBtn.classList.add('active');
    recBtn.textContent = '⏹️ Stop';
    messageEl.textContent = 'Recording... play your beat 🔴';
    if(looping) stopLoop();
  } else {
    recording = false;
    loopDuration = performance.now() - recordStart;
    recBtn.classList.remove('active');
    recBtn.textContent = '⏺️ Record';
    messageEl.textContent = recordedEvents.length
      ? 'Take captured — hit Loop to play it back 🔁'
      : 'No hits recorded. Try again 🥁';
  }
});

function stopLoop(){
  looping = false;
  loopBtn.classList.remove('active');
  loopBtn.textContent = '🔁 Loop';
  loopTimeouts.forEach(t => clearTimeout(t));
  loopTimeouts = [];
}

function scheduleLoop(){
  loopTimeouts.forEach(t => clearTimeout(t));
  loopTimeouts = recordedEvents.map(ev =>
    setTimeout(()=> hitPadPlayback(ev.idx, ev.vel), ev.t)
  );
  loopTimeouts.push(setTimeout(()=>{
    if(looping) scheduleLoop();
  }, Math.max(loopDuration, 200)));
}

function hitPadPlayback(idx, vel){
  initAudio();
  SOUND_FN[idx](vel);
  const el = padsEl.children[idx];
  el.classList.add('flash');
  setTimeout(()=>el.classList.remove('flash'), 120);
  const rect = el.getBoundingClientRect();
  const stageRect = canvas.getBoundingClientRect();
  const x = rect.left - stageRect.left + rect.width/2;
  const y = rect.top - stageRect.top + rect.height/2;
  spawnBurst(x, y, PADS[idx].color, vel);
}

loopBtn.addEventListener('click', ()=>{
  if(!recordedEvents.length){
    messageEl.textContent = 'Record a take first 🔴';
    return;
  }
  if(!looping){
    looping = true;
    loopBtn.classList.add('active');
    loopBtn.textContent = '⏹️ Stop';
    messageEl.textContent = 'Looping your take 🔁';
    scheduleLoop();
  } else {
    stopLoop();
    messageEl.textContent = 'Loop stopped';
  }
});

clearBtn.addEventListener('click', ()=>{
  stopLoop();
  recordedEvents = [];
  recording = false;
  recBtn.classList.remove('active');
  recBtn.textContent = '⏺️ Record';
  messageEl.textContent = 'Cleared. Tap the pads to play 🥁';
});

resize();
requestAnimationFrame(stepParticles);
</script>
</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break

case "story": {
if (!isBot) return
try {
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Stories</title>
<style>
:root{
  --bg:#08070b;
  --line:rgba(255,255,255,.09);
  --text:#fff;
  --muted:#aaa1ae;
  --gold:#ffd700;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;padding:0;background:radial-gradient(circle at top,#140a10 0%,#0b080d 45%,#050407 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
body{min-height:100vh;padding:12px;}
.app{width:min(100%,700px);margin:auto;}
.header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.avatar{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid var(--gold);font-size:21px;}
.title{font-size:17px;font-weight:800;color:var(--gold);}
.subtitle{color:var(--muted);font-size:10px;margin-top:2px;}

.menu{display:flex;flex-direction:column;gap:10px;}
.catBtn{
  display:flex;
  align-items:center;
  gap:12px;
  padding:14px 16px;
  border-radius:16px;
  border:1px solid var(--line);
  background:rgba(255,255,255,.04);
  cursor:pointer;
  text-align:left;
}
.catBtn:active{transform:scale(.98);}
.catBtn .icon{font-size:22px;width:34px;text-align:center;}
.catBtn .info b{display:block;font-size:14px;}
.catBtn .info span{font-size:11px;color:var(--muted);}
.catBtn.disabled{opacity:.45;}

.reader{display:none;}
.reader.active{display:block;}
.menu.hidden{display:none;}

.scene{
  border:1px solid var(--line);
  border-radius:16px;
  padding:18px;
  background:rgba(255,255,255,.02);
  min-height:220px;
  margin-bottom:10px;
}
.sceneLabel{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;opacity:.8;}
.storyText{font-size:14px;line-height:1.65;color:#eee;white-space:pre-wrap;min-height:140px;}
.cursor{opacity:.6;animation:blink 1s step-start infinite;}
@keyframes blink{50%{opacity:0;}}

.navRow{display:flex;gap:8px;}
.navBtn{flex:1;min-height:44px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.045);color:#fff;font-weight:700;font-size:13px;cursor:pointer;}
.navBtn.primary{border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.08);}
.navBtn:disabled{opacity:.3;}
.backBtn{margin-top:10px;width:100%;min-height:38px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:12px;cursor:pointer;}
.progress{font-size:10px;color:var(--muted);text-align:center;margin-top:8px;}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="avatar">📖</div>
    <div>
      <div class="title">Stories</div>
      <div class="subtitle">Pick a mood, then read</div>
    </div>
  </div>

  <div class="menu" id="menu"></div>

  <div class="reader" id="reader">
    <div class="scene">
      <div class="sceneLabel" id="sceneLabel">—</div>
      <div class="storyText" id="storyText"></div>
    </div>
    <div class="navRow">
      <button class="navBtn" id="prevBtn">◀ Back</button>
      <button class="navBtn primary" id="nextBtn">Next ▶</button>
    </div>
    <div class="progress" id="progress"></div>
    <button class="backBtn" id="menuBtn">↩️ Choose a different story</button>
  </div>
</div>

<script>
'use strict';

// ─── Story data ──────────────────────────────────────────────
// Each category: { icon, label, desc, beats: [ 'page 1 text', 'page 2 text', ... ] }
// To add a new story: fill the beats array for that key with plain text pages.
// Leave a category's beats array as [] (empty) to keep it disabled in the menu.

const CATEGORIES = {
  sad: {
    icon: '💔',
    label: 'Sad',
    desc: 'A quiet, heavy one',
    beats: [
      "A man wakes up in his small, clutter-filled apartment. The quiet is heavy. His wife passed away six months ago, and her coffee mug is still sitting on the nightstand, untouched.",
      "His phone rings. It's his daughter, Lily, 8 years old. She's been living with her grandmother because he hasn't been able to pull himself together.\\n\\nLily, softly: \\"Dad? Are you coming to my play tonight? You promised.\\"",
      "He looks at the empty vodka bottles on the counter. His voice breaks.\\n\\nMan: \\"I'll be there, bug. Front row.\\"",
      "He spends the day trying to fix himself — washing his face, ironing a clean shirt, walking to the bus stop with a small box of chocolates in hand. For the first time in months, he feels a sliver of hope.",
      "He sits on the bus, staring out the window at the rain. He pulls out a wrinkled family photo, tracing his thumb over his wife's face.",
      "The bus comes to a sudden stop outside the school. He steps out, hurries inside, and slides into a folding chair in the quiet auditorium. The lights dim. The kids walk onto the stage.",
      "He looks at the stage, searching the faces.\\n\\nLily isn't up there.",
      "His phone vibrates in his pocket. A text message from his mother-in-law:\\n\\n\\"We waited at the house for two hours. The play was last night, Marcus. We're moving to Chicago tomorrow.\\"",
      "He looks down at his phone. Then at the little box of chocolates in his lap.\\n\\nThe children on stage start to sing, their voices echoing in the warm room, as he sits completely still in the dark."
    ]
  },
  boring: {
    icon: '😐',
    label: 'Boring',
    desc: 'The 7:14 bus',
    beats: [
      "Tomas takes the 7:14 bus every morning. Same seat, third row, window side. Same driver, who nods but never speaks. Nothing has happened on this route in the four years he's ridden it.",
      "Today an old woman gets on two stops early. She sits across from him, holding a small potted plant wrapped in newspaper, balancing it carefully on her knees like it might spill.",
      "\\"New apartment,\\" she says, not really to him, just out loud. \\"First thing my husband ever bought me was a plant. Forty-one years ago. This is a cutting from it.\\"",
      "Tomas nods, the way you nod at strangers on buses. She keeps talking anyway, about the husband, gone six years now, about how the plant outlived him and somehow that felt like it mattered.",
      "The bus stops. Starts. Stops again. Ordinary traffic, ordinary light through the window. She tells him the plant's name is Walter, same as her husband's, and laughs at herself for saying it out loud.",
      "His stop comes. He stands, and for a second he almost offers to carry the plant up whatever stairs are waiting for her. He doesn't. He just says, \\"Good luck with Walter,\\" and she smiles like that was exactly the right thing to say.",
      "He gets off the bus. Same sidewalk, same walk to work, nothing about the day different from any other. Except tonight, when he tells someone about it, he'll realize it's the first time in four years he has anything at all to say about the 7:14."
    ]
  },
  good: {
    icon: '🌤️',
    label: 'Good',
    desc: 'The spare key',
    beats: [
      "Aiko had been locked out of her apartment before, but never in the rain, never with a bag of groceries slowly giving up on her, and never at 6pm on a Sunday when the landlord doesn't answer his phone.",
      "She sits on the stairwell step, soaked, laughing a little at how stupid the whole situation is. A door down the hall opens. An elderly neighbor she's only ever nodded at pokes his head out.",
      "\\"You're the one in 4B, right?\\" he asks. \\"Come in, dry off. You can't just sit on a step.\\" She hesitates — strangers, night, all the usual reasons not to. But he leaves the door open and goes back inside, kettle already on.",
      "His apartment smells like cedar and old books. He makes tea without asking if she wants any. Turns out he's lived in the building eleven years, has met almost none of his neighbors, and has more spare house keys hanging by the door than anyone needs.",
      "\\"Locksmiths don't come out cheap on Sundays,\\" he says, \\"but I've got a set of picks from when I used to do this for a living. No promises, but let's try your door before you call anyone.\\"",
      "It takes him four minutes. The door clicks open like it was never locked at all. Aiko doesn't know what to say, so she just laughs again, this time from relief instead of frustration.",
      "\\"Leave a spare with me next time,\\" he says, handing her a hook by his door already labeled, in careful handwriting, '4B'. \\"That's what neighbors are for.\\" She goes to bed that night thinking about how she almost didn't knock."
    ]
  },
  funny: {
    icon: '😂',
    label: 'Funny',
    desc: 'The wedding speech',
    beats: [
      "Derek had one job: give the best man speech at his brother's wedding. He'd practiced it forty times in the mirror. He had index cards. He was, by his own account, extremely prepared.",
      "What he had not prepared for was the open bar starting three hours before the speech, or his cousin challenging him to 'just one' shot of something called Ghost Pepper Vodka.",
      "By the time the DJ hands him the mic, Derek is functionally a different person. He unfolds his index cards. They are, he notices with some alarm, upside down. He does not fix this.",
      "\\"So,\\" Derek begins, to a room of two hundred people, \\"marriage — is like — a fine wine. Except sometimes the wine is your brother. And sometimes the wine forgets his own vows at rehearsal and I had to text them to him during the ceremony.\\"",
      "The groom, mortified, is laughing anyway because it's true. Derek soldiers on, references a childhood incident involving a trampoline and a garden hose that has nothing to do with weddings, and somehow lands on an actual heartfelt line by accident.",
      "\\"Point is,\\" Derek finishes, swaying slightly, \\"he found someone who puts up with him, which honestly is a bigger achievement than I put up with him, and I've known him literally his whole life.\\"",
      "The room erupts. It is, by unanimous family vote afterward, the worst-prepared and somehow best speech anyone had heard at a wedding in years. Derek finds his cards the next morning, still upside down, tucked into his shoe."
    ]
  },
  scary: {
    icon: '👻',
    label: 'Scary',
    desc: 'The night shift',
    beats: [
      "Maria takes the night shift at the parking garage because it pays better and nobody's around to bother her. Six floors, mostly empty after 11pm, one flickering light on level 3 that maintenance never quite fixes.",
      "Around 2am, the camera feed on level 3 shows a car she doesn't recognize. Doesn't match the entry log. She checks again. No ticket was ever issued for that spot.",
      "She walks up to check it in person, because that's the job. The car is empty. Dust on the windshield like it's been there for years, though the log insists this level was fully repainted last month — nothing could've sat there that long.",
      "Her radio crackles. Just static. Then, very faintly, a voice that sounds like her own, from the radio, asking: \\"Are you still on level 3?\\"",
      "She hasn't said anything into the radio. She checks — it's not even transmitting. She backs toward the stairwell door. It's locked. It was open ninety seconds ago.",
      "The flickering light on level 3 goes out completely. In the dark, she hears the dusty car's door open, slow and deliberate, though she is certain — she is certain — that she is the only person on this floor.",
      "The next morning's log shows her shift ending normally at 6am, her signature and all. Maria has no memory of leaving level 3. When she goes back the next night, the car is gone, and the light on level 3 works perfectly, for the first time in company records."
    ]
  }
};

// ─── Elements ─────────────────────────────────────────────
const menuEl = document.getElementById('menu');
const readerEl = document.getElementById('reader');
const sceneLabelEl = document.getElementById('sceneLabel');
const storyTextEl = document.getElementById('storyText');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressEl = document.getElementById('progress');
const menuBtn = document.getElementById('menuBtn');

let activeCategory = null;
let pageIndex = 0;
let typing = null;

function buildMenu(){
  menuEl.innerHTML = '';
  Object.keys(CATEGORIES).forEach(key=>{
    const cat = CATEGORIES[key];
    const hasContent = cat.beats.length > 0;
    const btn = document.createElement('div');
    btn.className = 'catBtn' + (hasContent ? '' : ' disabled');
    btn.innerHTML = '<div class="icon">'+cat.icon+'</div><div class="info"><b>'+cat.label+'</b><span>'+(hasContent ? cat.desc : 'Coming soon') +'</span></div>';
    if(hasContent){
      btn.addEventListener('click', ()=> openStory(key));
    }
    menuEl.appendChild(btn);
  });
}

function openStory(key){
  activeCategory = key;
  pageIndex = 0;
  menuEl.classList.add('hidden');
  readerEl.classList.add('active');
  sceneLabelEl.textContent = CATEGORIES[key].label + ' story';
  renderPage();
}

function typeText(text, cb){
  if(typing) clearInterval(typing);
  storyTextEl.innerHTML = '<span class="cursor">▌</span>';
  let i = 0;
  typing = setInterval(()=>{
    i++;
    storyTextEl.innerHTML = text.slice(0, i) + '<span class="cursor">▌</span>';
    if(i >= text.length){
      clearInterval(typing);
      storyTextEl.innerHTML = text;
      if(cb) cb();
    }
  }, 12);
}

function renderPage(){
  const beats = CATEGORIES[activeCategory].beats;
  const text = beats[pageIndex];
  prevBtn.disabled = pageIndex === 0;
  nextBtn.textContent = pageIndex === beats.length - 1 ? 'The End' : 'Next ▶';
  nextBtn.disabled = pageIndex === beats.length - 1;
  progressEl.textContent = 'Page ' + (pageIndex+1) + ' of ' + beats.length;
  typeText(text);
}

prevBtn.addEventListener('click', ()=>{
  if(pageIndex > 0){
    pageIndex--;
    renderPage();
  }
});

nextBtn.addEventListener('click', ()=>{
  const beats = CATEGORIES[activeCategory].beats;
  if(pageIndex < beats.length - 1){
    pageIndex++;
    renderPage();
  }
});

menuBtn.addEventListener('click', ()=>{
  readerEl.classList.remove('active');
  menuEl.classList.remove('hidden');
  activeCategory = null;
});

buildMenu();
</script>
</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break

case "resonate": {
if (!isBot) return
try {
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Resonate</title>
<style>
:root{
  --line:rgba(255,255,255,.12);
  --text:#fff;
  --muted:#aaa1ae;
  --acid:#c6ff3d;
  --beat:#ff426c;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;}
html,body{margin:0;padding:0;background:radial-gradient(circle at top,#141a08 0%,#0b080d 45%,#050407 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
body{min-height:100vh;padding:12px;}
.app{width:min(100%,700px);margin:auto;}
.header{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.avatar{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid var(--acid);font-size:20px;}
.title{font-size:17px;font-weight:800;color:var(--acid);}
.subtitle{color:var(--muted);font-size:10px;margin-top:2px;}

.controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.ctrl{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:rgba(255,255,255,.03);}
.ctrl label{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;}
.ctrl input[type=range]{width:100%;accent-color:var(--acid);}

.transport{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
.tbtn{flex:1;min-width:70px;min-height:42px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.045);color:#fff;font-weight:700;font-size:12px;cursor:pointer;}
.tbtn.play{border-color:var(--acid);color:var(--acid);}
.tbtn.play.active{background:var(--acid);color:#050407;box-shadow:0 0 16px rgba(140,255,0,.5);}
.tbtn.rec{border-color:var(--beat);color:var(--beat);}
.tbtn.rec.active{background:var(--beat);color:#fff;box-shadow:0 0 16px rgba(255,66,108,.5);}

.sectionLabel{font-size:10px;color:var(--muted);margin:8px 0 4px;text-transform:uppercase;letter-spacing:.06em;}

.seq{display:grid;grid-template-columns:repeat(16,1fr);gap:3px;margin-bottom:8px;}
.step{aspect-ratio:1;border-radius:5px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:pointer;position:relative;}
.step.beat4{background:rgba(255,255,255,.09);}
.step.on{background:var(--acid);box-shadow:0 0 8px rgba(140,255,0,.5);}
.step.playing{outline:2px solid #fff;}
.step .note{position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:6px;color:#050407;font-weight:800;}

.noteRow{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;}
.noteRow button{flex-shrink:0;min-width:30px;min-height:26px;border-radius:6px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);font-size:10px;cursor:pointer;}
.noteRow button.sel{border-color:var(--acid);color:var(--acid);background:rgba(140,255,0,.08);}

.drumRow{display:flex;align-items:center;gap:5px;margin-bottom:4px;}
.drumLabel{width:32px;flex-shrink:0;font-size:9px;color:var(--muted);}
.drumSteps{display:grid;grid-template-columns:repeat(16,1fr);gap:3px;flex:1;}
.dstep{aspect-ratio:1;border-radius:4px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:pointer;}
.dstep.beat4{background:rgba(255,255,255,.09);}
.dstep.on{background:var(--beat);box-shadow:0 0 6px rgba(255,66,108,.5);}
.dstep.playing{outline:2px solid #fff;}

.bottomRow{display:flex;gap:8px;margin-top:10px;}
.smallBtn{flex:1;min-height:38px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);font-size:11px;cursor:pointer;}
.smallBtn:disabled{opacity:.4;cursor:default;}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="avatar">🌀</div>
    <div>
      <div class="title">Resonate</div>
      <div class="subtitle">Acid bassline + heavy beats, with recording</div>
    </div>
  </div>

  <div class="controls">
    <div class="ctrl">
      <label><span>Cutoff</span><span id="cutoffVal">1800</span></label>
      <input type="range" id="cutoff" min="200" max="6000" value="1800">
    </div>
    <div class="ctrl">
      <label><span>Resonance</span><span id="resVal">18</span></label>
      <input type="range" id="resonance" min="1" max="28" value="18">
    </div>
    <div class="ctrl">
      <label><span>Decay</span><span id="decayVal">140</span></label>
      <input type="range" id="decay" min="40" max="400" value="140">
    </div>
    <div class="ctrl">
      <label><span>Tempo</span><span id="bpmVal">130</span></label>
      <input type="range" id="bpm" min="90" max="180" value="130">
    </div>
    <div class="ctrl">
      <label><span>Level</span><span id="levelVal">70</span></label>
      <input type="range" id="level" min="0" max="100" value="70">
    </div>
    <div class="ctrl">
      <label><span>Octave</span><span id="octaveVal">0</span></label>
      <input type="range" id="octave" min="-2" max="2" value="0">
    </div>
  </div>

  <div class="transport">
    <button class="tbtn play" id="playBtn">▶️ Play</button>
    <button class="tbtn rec" id="recBtn">⏺ Record</button>
    <button class="tbtn" id="randBtn">🎲 Random</button>
  </div>

  <div class="sectionLabel">Bass</div>
  <div class="seq" id="seq"></div>
  <div class="noteRow" id="noteRow"></div>

  <div class="sectionLabel">Beats</div>
  <div id="drums"></div>

  <div class="bottomRow">
    <button class="smallBtn" id="clearBtn">Clear</button>
    <button class="smallBtn" id="playRecBtn" disabled>▶️ Play Recording</button>
  </div>
</div>

<script>
'use strict';

let audioCtx = null;
let masterGain = null;
let compressor = null;
let recordDest = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingURL = null;
let isRecording = false;
let noiseBuffer = null;

function initAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 6;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.15;
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.4;
  masterGain.connect(compressor);
  compressor.connect(audioCtx.destination);

  recordDest = audioCtx.createMediaStreamDestination();
  compressor.connect(recordDest);

  const bufferSize = audioCtx.sampleRate * 1;
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
}
function resumeAudio(){
  initAudio();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}

function getLevel(){ return parseInt(levelSlider.value)/100; }
function getOctave(){ return parseInt(octaveSlider.value); }

const NOTE_FREQS = {
  'C2':65.4,'D2':73.4,'E2':82.4,'F2':87.3,'G2':98.0,'A2':110.0,'B2':123.5,
  'C3':130.8,'D3':146.8,'E3':164.8,'F3':174.6,'G3':196.0,'A3':220.0,'B3':246.9,
  'C4':261.6
};
const NOTE_LIST = Object.keys(NOTE_FREQS);

function playAcidNote(freq, cutoff, resonance, decayMs){
  const now = audioCtx.currentTime;
  const decay = decayMs / 1000;
  const level = getLevel();

  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, now);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = resonance;
  filter.frequency.setValueAtTime(cutoff * 2.2, now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff * 0.3, 80), now + decay);

  const gain = audioCtx.createGain();
  const peak = 0.35 + level * 0.55;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + decay + 0.05);
}

function playKick(now, level){
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4 + level * 0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.22);
}

function playSnare(now, level){
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.3 + level * 0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(now);
  noise.stop(now + 0.15);

  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 180;
  const oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.2 + level * 0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(oscGain);
  oscGain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

function playHat(now, level){
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15 + level * 0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(now);
  noise.stop(now + 0.06);
}

function playClap(now, level){
  for(let i=0;i<3;i++){
    const t = now + i*0.01;
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2 + level * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(t);
    noise.stop(t + 0.08);
  }
}

const DRUM_ROWS = [
  { key:'kick', label:'Kick', play: playKick },
  { key:'snare', label:'Snare', play: playSnare },
  { key:'hat', label:'Hat', play: playHat },
  { key:'clap', label:'Clap', play: playClap }
];

const STEPS = 16;
let pattern = Array.from({length:STEPS}, ()=>({ on:false, note:'C3' }));
let drumPattern = {
  kick: [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],
  snare:[false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
  hat:  [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false],
  clap: [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false]
};
let selectedStep = null;
let currentStep = 0;
let playing = false;
let timer = null;

const seqEl = document.getElementById('seq');
const noteRowEl = document.getElementById('noteRow');
const drumsEl = document.getElementById('drums');
const playBtn = document.getElementById('playBtn');
const recBtn = document.getElementById('recBtn');
const randBtn = document.getElementById('randBtn');
const clearBtn = document.getElementById('clearBtn');
const playRecBtn = document.getElementById('playRecBtn');

const cutoffSlider = document.getElementById('cutoff');
const resSlider = document.getElementById('resonance');
const decaySlider = document.getElementById('decay');
const bpmSlider = document.getElementById('bpm');
const levelSlider = document.getElementById('level');
const octaveSlider = document.getElementById('octave');
const cutoffVal = document.getElementById('cutoffVal');
const resVal = document.getElementById('resVal');
const decayVal = document.getElementById('decayVal');
const bpmVal = document.getElementById('bpmVal');
const levelVal = document.getElementById('levelVal');
const octaveVal = document.getElementById('octaveVal');

function buildSeq(){
  seqEl.innerHTML = '';
  pattern.forEach((step, i)=>{
    const el = document.createElement('div');
    el.className = 'step' + (i % 4 === 0 ? ' beat4' : '') + (step.on ? ' on' : '');
    el.innerHTML = step.on ? '<div class="note">'+step.note.replace(/[0-9]/,'')+'</div>' : '';
    el.addEventListener('click', ()=>{
      resumeAudio();
      if(!step.on){
        step.on = true;
        selectedStep = i;
      } else if(selectedStep === i){
        step.on = false;
        selectedStep = null;
      } else {
        selectedStep = i;
      }
      buildSeq();
      buildNoteRow();
      if(step.on) previewNote(step.note);
    });
    seqEl.appendChild(el);
  });
}

function buildNoteRow(){
  noteRowEl.innerHTML = '';
  if(selectedStep === null){
    noteRowEl.innerHTML = '<span style="font-size:10px;color:var(--muted);padding:4px">Tap a step, then pick its note</span>';
    return;
  }
  NOTE_LIST.forEach(note=>{
    const btn = document.createElement('button');
    btn.textContent = note;
    if(pattern[selectedStep].note === note) btn.classList.add('sel');
    btn.addEventListener('click', ()=>{
      pattern[selectedStep].note = note;
      buildSeq();
      buildNoteRow();
      previewNote(note);
    });
    noteRowEl.appendChild(btn);
  });
}

function buildDrums(){
  drumsEl.innerHTML = '';
  DRUM_ROWS.forEach(row=>{
    const rowEl = document.createElement('div');
    rowEl.className = 'drumRow';

    const labelEl = document.createElement('div');
    labelEl.className = 'drumLabel';
    labelEl.textContent = row.label;
    rowEl.appendChild(labelEl);

    const stepsEl = document.createElement('div');
    stepsEl.className = 'drumSteps';
    drumPattern[row.key].forEach((on, i)=>{
      const dstep = document.createElement('div');
      dstep.className = 'dstep' + (i % 4 === 0 ? ' beat4' : '') + (on ? ' on' : '');
      dstep.addEventListener('click', ()=>{
        resumeAudio();
        drumPattern[row.key][i] = !drumPattern[row.key][i];
        buildDrums();
        if(drumPattern[row.key][i]) row.play(audioCtx.currentTime, getLevel());
      });
      stepsEl.appendChild(dstep);
    });
    rowEl.appendChild(stepsEl);
    drumsEl.appendChild(rowEl);
  });
}

function previewNote(note){
  resumeAudio();
  const freq = NOTE_FREQS[note] * Math.pow(2, getOctave());
  playAcidNote(freq, parseInt(cutoffSlider.value), parseInt(resSlider.value), parseInt(decaySlider.value));
}

function stepTick(){
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('playing'));
  document.querySelectorAll('.dstep').forEach(s=>s.classList.remove('playing'));

  const bassStep = pattern[currentStep];
  const bassEl = seqEl.children[currentStep];
  if(bassEl) bassEl.classList.add('playing');
  if(bassStep.on){
    const freq = NOTE_FREQS[bassStep.note] * Math.pow(2, getOctave());
    playAcidNote(freq, parseInt(cutoffSlider.value), parseInt(resSlider.value), parseInt(decaySlider.value));
  }

  const level = getLevel();
  const now = audioCtx.currentTime;
  const drumRowEls = drumsEl.children;
  DRUM_ROWS.forEach((row, ri)=>{
    const stepsEl = drumRowEls[ri].querySelector('.drumSteps');
    const dEl = stepsEl.children[currentStep];
    if(dEl) dEl.classList.add('playing');
    if(drumPattern[row.key][currentStep]) row.play(now, level);
  });

  currentStep = (currentStep + 1) % STEPS;
}

function startPlay(){
  resumeAudio();
  playing = true;
  playBtn.textContent = '⏸️ Stop';
  playBtn.classList.add('active');
  currentStep = 0;
  const interval = (60 / parseInt(bpmSlider.value) / 4) * 1000;
  stepTick();
  timer = setInterval(stepTick, interval);
}
function stopPlay(){
  playing = false;
  playBtn.textContent = '▶️ Play';
  playBtn.classList.remove('active');
  clearInterval(timer);
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('playing'));
  document.querySelectorAll('.dstep').forEach(s=>s.classList.remove('playing'));
}

playBtn.addEventListener('click', ()=>{
  if(playing) stopPlay(); else startPlay();
});

recBtn.addEventListener('click', ()=>{
  resumeAudio();
  if(!isRecording){
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(recordDest.stream);
    mediaRecorder.ondataavailable = (e)=>{ if(e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      if(recordingURL) URL.revokeObjectURL(recordingURL);
      recordingURL = URL.createObjectURL(blob);
      playRecBtn.disabled = false;
    };
    mediaRecorder.start();
    isRecording = true;
    recBtn.textContent = '⏹ Stop Rec';
    recBtn.classList.add('active');
    if(!playing) startPlay();
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recBtn.textContent = '⏺ Record';
    recBtn.classList.remove('active');
  }
});

playRecBtn.addEventListener('click', ()=>{
  if(!recordingURL) return;
  const audioEl = new Audio(recordingURL);
  audioEl.play();
});

randBtn.addEventListener('click', ()=>{
  resumeAudio();
  pattern = Array.from({length:STEPS}, (_, i)=>({
    on: Math.random() < 0.55,
    note: NOTE_LIST[Math.floor(Math.random()*NOTE_LIST.length)]
  }));
  DRUM_ROWS.forEach(row=>{
    const density = row.key === 'kick' ? 0.3 : row.key === 'hat' ? 0.5 : 0.2;
    drumPattern[row.key] = Array.from({length:STEPS}, ()=> Math.random() < density);
  });
  selectedStep = null;
  buildSeq();
  buildNoteRow();
  buildDrums();
});

clearBtn.addEventListener('click', ()=>{
  pattern = Array.from({length:STEPS}, ()=>({ on:false, note:'C3' }));
  DRUM_ROWS.forEach(row=>{ drumPattern[row.key] = Array.from({length:STEPS}, ()=>false); });
  selectedStep = null;
  buildSeq();
  buildNoteRow();
  buildDrums();
});

[cutoffSlider, resSlider, decaySlider, bpmSlider, levelSlider, octaveSlider].forEach(s=>{
  s.addEventListener('input', ()=>{
    cutoffVal.textContent = cutoffSlider.value;
    resVal.textContent = resSlider.value;
    decayVal.textContent = decaySlider.value;
    bpmVal.textContent = bpmSlider.value;
    levelVal.textContent = levelSlider.value;
    octaveVal.textContent = octaveSlider.value;
    if(s === levelSlider && masterGain){
      masterGain.gain.value = (parseInt(levelSlider.value)/100) * 2.2;
    }
    if(playing){ stopPlay(); startPlay(); }
  });
});

buildSeq();
buildNoteRow();
buildDrums();
</script>
</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break


case "acid": {
if (!isBot) return
try {
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Acid 303</title>
<style>
:root{
  --line:rgba(255,255,255,.12);
  --text:#fff;
  --muted:#aaa1ae;
  --acid:#c6ff3d;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;}
html,body{margin:0;padding:0;background:radial-gradient(circle at top,#141a08 0%,#0b080d 45%,#050407 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
body{min-height:100vh;padding:12px;}
.app{width:min(100%,700px);margin:auto;}
.header{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.avatar{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid var(--acid);font-size:20px;}
.title{font-size:17px;font-weight:800;color:var(--acid);}
.subtitle{color:var(--muted);font-size:10px;margin-top:2px;}

.controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.ctrl{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:rgba(255,255,255,.03);}
.ctrl label{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;}
.ctrl input[type=range]{width:100%;accent-color:var(--acid);}

.transport{display:flex;gap:8px;margin-bottom:10px;}
.tbtn{flex:1;min-height:42px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.045);color:#fff;font-weight:700;font-size:12px;cursor:pointer;}
.tbtn.play{border-color:var(--acid);color:var(--acid);}
.tbtn.play.active{background:var(--acid);color:#050407;box-shadow:0 0 16px rgba(140,255,0,.5);}
.tbtn.loud.active{border-color:#ff426c;color:#ff426c;background:rgba(255,66,108,.1);}

.seq{display:grid;grid-template-columns:repeat(16,1fr);gap:3px;margin-bottom:10px;}
.step{aspect-ratio:1;border-radius:5px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:pointer;position:relative;}
.step.beat4{background:rgba(255,255,255,.09);}
.step.on{background:var(--acid);box-shadow:0 0 8px rgba(140,255,0,.5);}
.step.playing{outline:2px solid #fff;}
.step .note{position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:6px;color:#050407;font-weight:800;}

.noteRow{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;}
.noteRow button{flex-shrink:0;min-width:30px;min-height:26px;border-radius:6px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);font-size:10px;cursor:pointer;}
.noteRow button.sel{border-color:var(--acid);color:var(--acid);background:rgba(140,255,0,.08);}

.bottomRow{display:flex;gap:8px;}
.smallBtn{flex:1;min-height:38px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);font-size:11px;cursor:pointer;}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="avatar">🧪</div>
    <div>
      <div class="title">Acid 303</div>
      <div class="subtitle">TB-303 style acid bassline</div>
    </div>
  </div>

  <div class="controls">
    <div class="ctrl">
      <label><span>Cutoff</span><span id="cutoffVal">1800</span></label>
      <input type="range" id="cutoff" min="200" max="6000" value="1800">
    </div>
    <div class="ctrl">
      <label><span>Resonance</span><span id="resVal">18</span></label>
      <input type="range" id="resonance" min="1" max="28" value="18">
    </div>
    <div class="ctrl">
      <label><span>Decay</span><span id="decayVal">140</span></label>
      <input type="range" id="decay" min="40" max="400" value="140">
    </div>
    <div class="ctrl">
      <label><span>Tempo</span><span id="bpmVal">130</span></label>
      <input type="range" id="bpm" min="90" max="180" value="130">
    </div>
  </div>

  <div class="transport">
    <button class="tbtn play" id="playBtn">▶️ Play</button>
    <button class="tbtn loud" id="loudBtn">🔊 Loud</button>
    <button class="tbtn" id="randBtn">🎲 Random</button>
  </div>

  <div class="seq" id="seq"></div>

  <div class="noteRow" id="noteRow"></div>

  <div class="bottomRow">
    <button class="smallBtn" id="clearBtn">Clear</button>
    <button class="smallBtn" id="octDownBtn">Oct -</button>
    <button class="smallBtn" id="octUpBtn">Oct +</button>
  </div>
</div>

<script>
'use strict';

let audioCtx = null;
let masterGain = null;
let compressor = null;
let loud = false;

function initAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 6;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.15;
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.4;
  masterGain.connect(compressor);
  compressor.connect(audioCtx.destination);
}
function resumeAudio(){
  initAudio();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}

const NOTE_FREQS = {
  'C2':65.4,'D2':73.4,'E2':82.4,'F2':87.3,'G2':98.0,'A2':110.0,'B2':123.5,
  'C3':130.8,'D3':146.8,'E3':164.8,'F3':174.6,'G3':196.0,'A3':220.0,'B3':246.9,
  'C4':261.6
};
const NOTE_LIST = Object.keys(NOTE_FREQS);

function playAcidNote(freq, cutoff, resonance, decayMs){
  const now = audioCtx.currentTime;
  const decay = decayMs / 1000;

  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, now);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = resonance;
  filter.frequency.setValueAtTime(cutoff * 2.2, now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff * 0.3, 80), now + decay);

  const gain = audioCtx.createGain();
  const peak = loud ? 0.9 : 0.55;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + decay + 0.05);
}

const STEPS = 16;
let pattern = Array.from({length:STEPS}, ()=>({ on:false, note:'C3' }));
let selectedStep = null;
let octaveShift = 0;
let currentStep = 0;
let playing = false;
let timer = null;

const seqEl = document.getElementById('seq');
const noteRowEl = document.getElementById('noteRow');
const playBtn = document.getElementById('playBtn');
const loudBtn = document.getElementById('loudBtn');
const randBtn = document.getElementById('randBtn');
const clearBtn = document.getElementById('clearBtn');
const octDownBtn = document.getElementById('octDownBtn');
const octUpBtn = document.getElementById('octUpBtn');

const cutoffSlider = document.getElementById('cutoff');
const resSlider = document.getElementById('resonance');
const decaySlider = document.getElementById('decay');
const bpmSlider = document.getElementById('bpm');
const cutoffVal = document.getElementById('cutoffVal');
const resVal = document.getElementById('resVal');
const decayVal = document.getElementById('decayVal');
const bpmVal = document.getElementById('bpmVal');

function buildSeq(){
  seqEl.innerHTML = '';
  pattern.forEach((step, i)=>{
    const el = document.createElement('div');
    el.className = 'step' + (i % 4 === 0 ? ' beat4' : '') + (step.on ? ' on' : '');
    el.innerHTML = step.on ? '<div class="note">'+step.note.replace(/[0-9]/,'')+'</div>' : '';
    el.addEventListener('click', ()=>{
      resumeAudio();
      if(!step.on){
        step.on = true;
        selectedStep = i;
      } else if(selectedStep === i){
        step.on = false;
        selectedStep = null;
      } else {
        selectedStep = i;
      }
      buildSeq();
      buildNoteRow();
      if(step.on) previewNote(step.note);
    });
    seqEl.appendChild(el);
  });
}

function buildNoteRow(){
  noteRowEl.innerHTML = '';
  if(selectedStep === null){
    noteRowEl.innerHTML = '<span style="font-size:10px;color:var(--muted);padding:4px">Tap a step, then pick its note</span>';
    return;
  }
  NOTE_LIST.forEach(note=>{
    const btn = document.createElement('button');
    btn.textContent = note;
    if(pattern[selectedStep].note === note) btn.classList.add('sel');
    btn.addEventListener('click', ()=>{
      pattern[selectedStep].note = note;
      buildSeq();
      buildNoteRow();
      previewNote(note);
    });
    noteRowEl.appendChild(btn);
  });
}

function previewNote(note){
  resumeAudio();
  const freq = NOTE_FREQS[note] * Math.pow(2, octaveShift);
  playAcidNote(freq, parseInt(cutoffSlider.value), parseInt(resSlider.value), parseInt(decaySlider.value));
}

function stepTick(){
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('playing'));
  const step = pattern[currentStep];
  const el = seqEl.children[currentStep];
  el.classList.add('playing');
  if(step.on){
    const freq = NOTE_FREQS[step.note] * Math.pow(2, octaveShift);
    playAcidNote(freq, parseInt(cutoffSlider.value), parseInt(resSlider.value), parseInt(decaySlider.value));
  }
  currentStep = (currentStep + 1) % STEPS;
}

function startPlay(){
  resumeAudio();
  playing = true;
  playBtn.textContent = '⏸️ Stop';
  playBtn.classList.add('active');
  currentStep = 0;
  const interval = (60 / parseInt(bpmSlider.value) / 4) * 1000;
  stepTick();
  timer = setInterval(stepTick, interval);
}
function stopPlay(){
  playing = false;
  playBtn.textContent = '▶️ Play';
  playBtn.classList.remove('active');
  clearInterval(timer);
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('playing'));
}

playBtn.addEventListener('click', ()=>{
  if(playing) stopPlay(); else startPlay();
});

loudBtn.addEventListener('click', ()=>{
  loud = !loud;
  loudBtn.classList.toggle('active', loud);
  if(masterGain) masterGain.gain.value = loud ? 1.8 : 1.4;
});

randBtn.addEventListener('click', ()=>{
  resumeAudio();
  pattern = Array.from({length:STEPS}, (_, i)=>({
    on: Math.random() < 0.55,
    note: NOTE_LIST[Math.floor(Math.random()*NOTE_LIST.length)]
  }));
  selectedStep = null;
  buildSeq();
  buildNoteRow();
});

clearBtn.addEventListener('click', ()=>{
  pattern = Array.from({length:STEPS}, ()=>({ on:false, note:'C3' }));
  selectedStep = null;
  buildSeq();
  buildNoteRow();
});

octDownBtn.addEventListener('click', ()=>{ octaveShift = Math.max(-2, octaveShift - 1); });
octUpBtn.addEventListener('click', ()=>{ octaveShift = Math.min(2, octaveShift + 1); });

[cutoffSlider, resSlider, decaySlider, bpmSlider].forEach(s=>{
  s.addEventListener('input', ()=>{
    cutoffVal.textContent = cutoffSlider.value;
    resVal.textContent = resSlider.value;
    decayVal.textContent = decaySlider.value;
    bpmVal.textContent = bpmSlider.value;
    if(playing){ stopPlay(); startPlay(); }
  });
});

buildSeq();
buildNoteRow();
</script>
</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break

case "games": {
if (!isBot) return
await snowi.richMenu(from, {
header: {
    disclaimer: true,
    disclaimerText: "By AstaTech",
    title: "Asta Games"
},
body: {
carousel: true,
cards: [
    {
    title: "\u265f\ufe0f Chess",
    buttons: ["chess"],
    toast: "Play chess against the AI, right in chat"
    },
    {
    title: "\ud83d\udcd6 Stories",
    buttons: ["story"],
    toast: "Pick a mood \u2014 sad, good, funny, scary, or boring \u2014 and read"
    },
    {
    title: "\ud83e\uddea Acid 303",
    buttons: ["acid"],
    toast: "A loud, squelchy TB-303 style bassline sequencer"
    },
    {
    title: "\ud83e\udd41 Beat Pad",
    buttons: ["beat"],
    toast: "Tap-drum performance pads with record and loop"
    },
    {
    title: "\ud83c\udfae Arcade",
    buttons: ["arcade"],
    toast: "Animated coin flip, dice, and rock-paper-scissors"
    },
    {
    title: "\ud83e\udd87 Flappy Bat",
    buttons: ["flappy"],
    toast: "A relaxed flap-to-fly game \u2014 wide gaps, no stress"
    }
]
},
footer: {
text: "Type a command to launch it"
}
})
await sendMenuAudio()
} break

case "chess": {
if (!isBot) return
try {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">

<title>Batman Chess</title>

<style>
:root{
  --bg:#08070b;
  --panel:#121017;
  --panel2:#19151f;
  --line:rgba(255,255,255,.09);
  --text:#fff;
  --muted:#aaa1ae;
  --gold:#ffd700;
  --gold2:#ffed4a;

  --light:#f2d7b5;
  --dark:#a96f54;

  --selected:#ffd45c;
  --move:rgba(93,255,167,.75);
  --capture:rgba(255,80,110,.9);
  --check:#ff426c;
}

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,body{
  margin:0;
  padding:0;
  background:
    radial-gradient(circle at top,#1a0a0a 0%,#0b080d 45%,#050407 100%);
  color:var(--text);
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Arial,
    sans-serif;
}

body{
  min-height:100vh;
  padding:12px;
}

.app{
  width:min(100%,760px);
  margin:auto;
}

.header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:12px;
}

.brand{
  display:flex;
  align-items:center;
  gap:10px;
}

.avatar{
  width:46px;
  height:46px;
  border-radius:15px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:
    linear-gradient(135deg,#1a1a2e,#0d0d1a);
  border:2px solid var(--gold);
  box-shadow:0 8px 25px rgba(255,215,0,.22);
  font-size:25px;
}

.title{
  font-size:19px;
  font-weight:800;
  color:var(--gold);
}

.subtitle{
  color:var(--muted);
  font-size:11px;
  margin-top:2px;
}

.status{
  padding:8px 11px;
  border:1px solid var(--line);
  border-radius:12px;
  background:rgba(255,255,255,.035);
  color:#ddd;
  font-size:11px;
}

.controls{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-bottom:10px;
}

.select,
.btn{
  min-height:42px;
  border-radius:13px;
  border:1px solid var(--line);
  background:rgba(255,255,255,.045);
  color:#fff;
  font-size:13px;
  outline:none;
}

.select{
  padding:0 12px;
}

.btn{
  padding:0 12px;
  font-weight:700;
  cursor:pointer;
}

.btn:active{
  transform:scale(.97);
}

.btn.primary{
  background:linear-gradient(135deg,#2d2d44,#1a1a2e);
  border:1px solid var(--gold);
  color:var(--gold);
}

.boardWrap{
  position:relative;
  width:100%;
  max-width:680px;
  margin:auto;
  padding:8px;
  border-radius:22px;
  background:
    linear-gradient(145deg,
      rgba(255,215,0,.10),
      rgba(255,215,0,.025));
  box-shadow:
    0 20px 60px rgba(0,0,0,.45),
    0 0 40px rgba(255,215,0,.08);
}

.board{
  position:relative;
  width:100%;
  aspect-ratio:1;
  display:grid;
  grid-template-columns:repeat(8,1fr);
  overflow:hidden;
  border-radius:15px;
  touch-action:none;
  user-select:none;
}

.square{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  aspect-ratio:1;
  cursor:pointer;
}

.square.light{
  background:var(--light);
}

.square.dark{
  background:var(--dark);
}

.square.selected{
  box-shadow:inset 0 0 0 4px var(--selected);
}

.square.check{
  background:
    radial-gradient(circle,
      rgba(255,30,80,.95),
      rgba(255,30,80,.35) 55%,
      transparent 75%);
}

.piece{
  position:relative;
  z-index:4;
  font-size:clamp(28px,8vw,61px);
  line-height:1;
  filter:
    drop-shadow(0 3px 2px rgba(0,0,0,.45));
  transition:transform .1s ease;
}

.piece.w {
  color: #ffffff;
}

.piece.b {
  color: #000000;
  filter: drop-shadow(0 3px 2px rgba(255,255,255,.2));
}

.square.selected .piece{
  transform:scale(1.08);
}

.moveDot{
  position:absolute;
  width:22%;
  height:22%;
  border-radius:50%;
  background:var(--move);
  z-index:2;
  box-shadow:0 0 10px rgba(93,255,167,.35);
}

.captureRing{
  position:absolute;
  inset:8%;
  border-radius:50%;
  border:5px solid var(--capture);
  z-index:2;
}

.coord{
  position:absolute;
  font-size:9px;
  font-weight:800;
  opacity:.65;
  pointer-events:none;
}

.file{
  right:4px;
  bottom:2px;
}

.rank{
  left:4px;
  top:2px;
}

.light .coord{
  color:#754c39;
}

.dark .coord{
  color:#f5dcc5;
}

.info{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:8px;
  margin-top:10px;
}

.card{
  padding:11px;
  min-height:62px;
  border:1px solid var(--line);
  border-radius:14px;
  background:rgba(255,255,255,.035);
  text-align:center;
}

.card b{
  display:block;
  font-size:15px;
}

.card span{
  color:var(--muted);
  font-size:10px;
}

.captured{
  min-height:38px;
  margin-top:10px;
  padding:9px 12px;
  border:1px solid var(--line);
  border-radius:13px;
  background:rgba(255,255,255,.03);
  color:#ddd;
  font-size:19px;
  word-break:break-word;
}

.message{
  margin-top:10px;
  padding:11px 13px;
  border-radius:13px;
  background:rgba(255,215,0,.07);
  border:1px solid rgba(255,215,0,.14);
  text-align:center;
  color:#ffed4a;
  font-size:12px;
  min-height:40px;
  display:flex;
  align-items:center;
  justify-content:center;
}

.actions{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px;
  margin-top:10px;
}

.overlay{
  position:fixed;
  inset:0;
  z-index:50;
  display:none;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:rgba(0,0,0,.72);
  backdrop-filter:blur(8px);
}

.overlay.show{
  display:flex;
}

.modal{
  width:min(92vw,420px);
  padding:23px;
  border-radius:23px;
  background:
    linear-gradient(145deg,#1c151e,#0f0c12);
  border:1px solid rgba(255,215,0,.30);
  box-shadow:0 25px 80px rgba(0,0,0,.65);
  text-align:center;
}

.modalIcon{
  font-size:55px;
  margin-bottom:7px;
}

.modal h2{
  margin:5px 0;
  font-size:24px;
  color:var(--gold);
}

.modal p{
  color:var(--muted);
  font-size:13px;
  margin-bottom:17px;
}

.modeButtons{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:9px;
}

.modeBtn{
  padding:14px 10px;
  border-radius:14px;
  border:1px solid var(--line);
  background:rgba(255,255,255,.045);
  color:#fff;
  cursor:pointer;
}

.modeBtn strong{
  display:block;
  margin-bottom:3px;
}

.modeBtn small{
  color:var(--muted);
}

.promotion{
  position:fixed;
  inset:0;
  z-index:60;
  display:none;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,.68);
}

.promotion.show{
  display:flex;
}

.promoBox{
  padding:18px;
  border-radius:20px;
  background:#171219;
  border:1px solid var(--line);
}

.promoBox h3{
  margin:0 0 12px;
  text-align:center;
  color:var(--gold);
}

.promoChoices{
  display:flex;
  gap:8px;
}

.promo{
  width:60px;
  height:60px;
  border:0;
  border-radius:13px;
  background:#29202a;
  color:white;
  font-size:39px;
}

@media(max-width:430px){
  body{
    padding:8px;
  }

  .boardWrap{
    padding:5px;
    border-radius:17px;
  }

  .info{
    gap:5px;
  }

  .card{
    padding:9px 4px;
  }

  .actions{
    grid-template-columns:1fr 1fr 1fr;
  }
}
</style>
</head>

<body>

<div class="app">

  <div class="header">
    <div class="brand">
      <div class="avatar">🦇</div>
      <div>
        <div class="title">Batman Chess</div>
        <div class="subtitle">"The Dark Knight plays chess" ♟️</div>
      </div>
    </div>

    <div class="status" id="status">White turn</div>
  </div>

  <div class="controls">
    <select id="mode" class="select">
      <option value="easy">🟢 Easy</option>
      <option value="medium" selected>🔵 Medium</option>
      <option value="hard">🟣 Hard</option>
      <option value="master">🔴 Master</option>
      <option value="pvp">👥 2 Player</option>
    </select>

    <button class="btn primary" id="newGame">
      ♻️ New Game
    </button>
  </div>

  <div class="boardWrap">
    <div id="board" class="board"></div>
  </div>

  <div class="info">
    <div class="card">
      <b id="turnText">White</b>
      <span>Turn</span>
    </div>

    <div class="card">
      <b id="moveText">0</b>
      <span>Moves</span>
    </div>

    <div class="card">
      <b id="modeText">Medium</b>
      <span>Mode</span>
    </div>
  </div>

  <div class="captured" id="captured">
    ⚪ —
  </div>

  <div class="message" id="message">
    Select a piece to start playing ♟️
  </div>

  <div class="actions">
    <button class="btn" id="undo">↩️ Undo</button>
    <button class="btn" id="flip">🔄 Flip</button>
    <button class="btn" id="resign">🏳️ Resign</button>
  </div>

</div>

<div class="overlay" id="overlay">
  <div class="modal">

    <div class="modalIcon" id="resultIcon">🏆</div>

    <h2 id="resultTitle">Checkmate!</h2>

    <p id="resultText">
      White wins.
    </p>

    <div class="modeButtons">
      <button class="modeBtn" data-mode="easy">
        <strong>🟢 Easy</strong>
        <small>Casual</small>
      </button>

      <button class="modeBtn" data-mode="medium">
        <strong>🔵 Medium</strong>
        <small>Normal</small>
      </button>

      <button class="modeBtn" data-mode="hard">
        <strong>🟣 Hard</strong>
        <small>Difficult</small>
      </button>

      <button class="modeBtn" data-mode="master">
        <strong>🔴 Master</strong>
        <small>Serious 😤</small>
      </button>

      <button class="modeBtn" data-mode="pvp">
        <strong>👥 2 Player</strong>
        <small>Friend vs Friend</small>
      </button>

      <button class="modeBtn" id="playAgain">
        <strong>♻️ Rematch</strong>
        <small>Play again</small>
      </button>
    </div>

  </div>
</div>

<div class="promotion" id="promotion">
  <div class="promoBox">
    <h3>Promote Pawn 👑</h3>

    <div class="promoChoices">
      <button class="promo" data-piece="q">♕</button>
      <button class="promo" data-piece="r">♖</button>
      <button class="promo" data-piece="b">♗</button>
      <button class="promo" data-piece="n">♘</button>
    </div>
  </div>
</div>

<script>
'use strict';

// ─── Audio System ──────────────────────────────────────────
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'capture') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    console.error("Audio error", e);
  }
}

// ─── Constants ─────────────────────────────────────────────
const WHITE = 'w';
const BLACK = 'b';

const PIECES = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' }
};

const VALUE = { p:100, n:320, b:330, r:500, q:900, k:20000 };
const FILES = ['a','b','c','d','e','f','g','h'];

// ─── Elements ──────────────────────────────────────────────
const boardEl = document.getElementById('board');
const modeEl = document.getElementById('mode');
const statusEl = document.getElementById('status');
const turnText = document.getElementById('turnText');
const moveText = document.getElementById('moveText');
const modeText = document.getElementById('modeText');
const messageEl = document.getElementById('message');
const capturedEl = document.getElementById('captured');
const overlay = document.getElementById('overlay');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const promotionEl = document.getElementById('promotion');

// ─── Game State ────────────────────────────────────────────
let board = [];
let turn = WHITE;
let selected = null;
let legalSelected = [];
let history = [];
let flipped = false;
let gameOver = false;
let thinking = false;
let pendingPromotion = null;
let castle = { w: { k:true, q:true }, b: { k:true, q:true } };
let enPassant = null;
let halfmove = 0;
let fullmove = 1;
let captured = { w:[], b:[] };
let mode = 'medium';

// ─── Helpers ──────────────────────────────────────────────
function cloneBoard(b){ return b.map(row => row.map(p => p ? {...p} : null)); }
function inside(r,c){ return r >= 0 && r < 8 && c >= 0 && c < 8; }
function opposite(color){ return color === WHITE ? BLACK : WHITE; }
function pieceAt(r,c){ if(!inside(r,c)) return null; return board[r][c]; }
function makePiece(color,type){ return {color,type}; }
function randomChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function cloneState(){
  return {
    board: cloneBoard(board),
    turn,
    castle: JSON.parse(JSON.stringify(castle)),
    enPassant: enPassant ? {...enPassant} : null,
    halfmove,
    fullmove,
    captured:{ w:[...captured.w], b:[...captured.b] }
  };
}

function restoreState(s){
  board = cloneBoard(s.board);
  turn = s.turn;
  castle = JSON.parse(JSON.stringify(s.castle));
  enPassant = s.enPassant ? {...s.enPassant} : null;
  halfmove = s.halfmove;
  fullmove = s.fullmove;
  captured = { w:[...s.captured.w], b:[...s.captured.b] };
  selected = null;
  legalSelected = [];
}

// ─── Board Functions ──────────────────────────────────────
function createInitialBoard(){
  const b = Array.from({length:8},()=>Array(8).fill(null));
  const back = ['r','n','b','q','k','b','n','r'];
  for(let c=0;c<8;c++){
    b[0][c] = makePiece(BLACK,back[c]);
    b[1][c] = makePiece(BLACK,'p');
    b[6][c] = makePiece(WHITE,'p');
    b[7][c] = makePiece(WHITE,back[c]);
  }
  return b;
}

// ─── Game Logic ────────────────────────────────────────────
function isSquareAttacked(b,r,c,byColor){
  const pawnDir = byColor === WHITE ? 1 : -1;
  for(const dc of [-1,1]){
    const rr = r + pawnDir, cc = c + dc;
    if(inside(rr,cc)){
      const p = b[rr][cc];
      if(p && p.color === byColor && p.type === 'p') return true;
    }
  }
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for(const [dr,dc] of knightMoves){
    const p = pieceAtBoard(b,r+dr,c+dc);
    if(p && p.color === byColor && p.type === 'n') return true;
  }
  for(let dr=-1;dr<=1;dr++){
    for(let dc=-1;dc<=1;dc++){
      if(!dr && !dc) continue;
      const p = pieceAtBoard(b,r+dr,c+dc);
      if(p && p.color === byColor && p.type === 'k') return true;
    }
  }
  const diagonals = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for(const [dr,dc] of diagonals){
    let rr = r+dr, cc = c+dc;
    while(inside(rr,cc)){
      const p = pieceAtBoard(b,rr,cc);
      if(p){
        if(p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      rr += dr; cc += dc;
    }
  }
  const straight = [[-1,0],[1,0],[0,-1],[0,1]];
  for(const [dr,dc] of straight){
    let rr = r+dr, cc = c+dc;
    while(inside(rr,cc)){
      const p = pieceAtBoard(b,rr,cc);
      if(p){
        if(p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      rr += dr; cc += dc;
    }
  }
  return false;
}

function pieceAtBoard(b,r,c){ if(!inside(r,c)) return null; return b[r][c]; }

function findKing(b,color){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p && p.color === color && p.type === 'k') return {r,c};
    }
  }
  return null;
}

function inCheck(b,color){
  const king = findKing(b,color);
  if(!king) return true;
  return isSquareAttacked(b, king.r, king.c, opposite(color));
}

// ─── Move Generation ──────────────────────────────────────
function pseudoMoves(b,r,c,stateTurn){
  const p = b[r][c];
  if(!p || p.color !== stateTurn) return [];
  const moves = [];
  function add(rr,cc,extra={}){
    if(!inside(rr,cc)) return;
    const target = b[rr][cc];
    if(target && target.color === p.color) return;
    moves.push({ from:{r,c}, to:{r:rr,c:cc}, ...extra });
  }
  if(p.type === 'p'){
    const dir = p.color === WHITE ? -1 : 1;
    const start = p.color === WHITE ? 6 : 1;
    if(inside(r+dir,c) && !b[r+dir][c]){
      add(r+dir,c);
      if(r === start && !b[r+dir*2][c]) add(r+dir*2,c,{doublePawn:true});
    }
    for(const dc of [-1,1]){
      const rr = r+dir, cc = c+dc;
      if(!inside(rr,cc)) continue;
      const target = b[rr][cc];
      if(target && target.color !== p.color) add(rr,cc,{capture:true});
      if(enPassant && enPassant.r === rr && enPassant.c === cc) add(rr,cc,{enPassant:true,capture:true});
    }
  }
  if(p.type === 'n'){
    const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(const [dr,dc] of jumps) add(r+dr,c+dc);
  }
  if(p.type === 'b' || p.type === 'r' || p.type === 'q'){
    const dirs = [];
    if(p.type === 'b' || p.type === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if(p.type === 'r' || p.type === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    for(const [dr,dc] of dirs){
      let rr = r+dr, cc = c+dc;
      while(inside(rr,cc)){
        const target = b[rr][cc];
        if(!target){ add(rr,cc); }
        else { if(target.color !== p.color) add(rr,cc,{capture:true}); break; }
        rr += dr; cc += dc;
      }
    }
  }
  if(p.type === 'k'){
    for(let dr=-1;dr<=1;dr++){
      for(let dc=-1;dc<=1;dc++){
        if(!dr && !dc) continue;
        add(r+dr,c+dc);
      }
    }
    const rights = castle[p.color];
    if(rights && !inCheck(b,p.color)){
      if(rights.k && !b[r][5] && !b[r][6] && b[r][7] && b[r][7].type === 'r' && b[r][7].color === p.color && !isSquareAttacked(b,r,5,opposite(p.color)) && !isSquareAttacked(b,r,6,opposite(p.color))){
        moves.push({ from:{r,c}, to:{r,c:6}, castle:'k' });
      }
      if(rights.q && !b[r][1] && !b[r][2] && !b[r][3] && b[r][0] && b[r][0].type === 'r' && b[r][0].color === p.color && !isSquareAttacked(b,r,3,opposite(p.color)) && !isSquareAttacked(b,r,2,opposite(p.color))){
        moves.push({ from:{r,c}, to:{r,c:2}, castle:'q' });
      }
    }
  }
  return moves;
}

function applyMoveToBoard(b,move,promotion='q'){
  const next = cloneBoard(b);
  const p = next[move.from.r][move.from.c];
  if(!p) return next;
  let capturedPiece = next[move.to.r][move.to.c];
  next[move.from.r][move.from.c] = null;
  if(move.enPassant){
    const dir = p.color === WHITE ? 1 : -1;
    const rr = move.to.r + dir;
    capturedPiece = next[rr][move.to.c];
    next[rr][move.to.c] = null;
  }
  next[move.to.r][move.to.c] = {...p};
  if(p.type === 'p' && (move.to.r === 0 || move.to.r === 7)){
    next[move.to.r][move.to.c].type = promotion || 'q';
  }
  if(move.castle === 'k'){
    next[move.from.r][5] = next[move.from.r][7];
    next[move.from.r][7] = null;
  }
  if(move.castle === 'q'){
    next[move.from.r][3] = next[move.from.r][0];
    next[move.from.r][0] = null;
  }
  return next;
}

function legalMovesForPiece(b,r,c,color){
  const pseudo = pseudoMoves(b,r,c,color);
  const legal = [];
  for(const move of pseudo){
    const next = applyMoveToBoard(b,move,'q');
    if(!inCheck(next,color)) legal.push(move);
  }
  return legal;
}

function allLegalMoves(b,color){
  const result = [];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(p && p.color === color) result.push(...legalMovesForPiece(b,r,c,color));
    }
  }
  return result;
}

// ─── Execute Move ─────────────────────────────────────────
function executeMove(move,promotion='q',save=true){
  if(gameOver) return;
  initAudio();
  const before = cloneState();
  const moving = board[move.from.r][move.from.c];
  let capturedPiece = board[move.to.r][move.to.c];
  if(move.enPassant){
    const dir = moving.color === WHITE ? 1 : -1;
    capturedPiece = board[move.to.r + dir][move.to.c];
  }
  board = applyMoveToBoard(board,move,promotion);
  if(capturedPiece){ captured[moving.color].push(capturedPiece); playSound('capture'); }
  else { playSound('move'); }
  if(moving.type === 'k'){ castle[moving.color].k = false; castle[moving.color].q = false; }
  if(moving.type === 'r'){
    if(moving.color === WHITE){
      if(move.from.r === 7 && move.from.c === 0) castle.w.q = false;
      if(move.from.r === 7 && move.from.c === 7) castle.w.k = false;
    } else {
      if(move.from.r === 0 && move.from.c === 0) castle.b.q = false;
      if(move.from.r === 0 && move.from.c === 7) castle.b.k = false;
    }
  }
  if(capturedPiece && capturedPiece.type === 'r'){
    if(move.to.r === 7 && move.to.c === 0) castle.w.q = false;
    if(move.to.r === 7 && move.to.c === 7) castle.w.k = false;
    if(move.to.r === 0 && move.to.c === 0) castle.b.q = false;
    if(move.to.r === 0 && move.to.c === 7) castle.b.k = false;
  }
  enPassant = null;
  if(moving.type === 'p' && Math.abs(move.to.r - move.from.r) === 2){
    enPassant = { r:(move.to.r + move.from.r) / 2, c:move.from.c };
  }
  if(moving.type === 'p' || capturedPiece) halfmove = 0;
  else halfmove++;
  if(moving.color === BLACK) fullmove++;
  if(save) history.push(before);
  turn = opposite(turn);
  selected = null;
  legalSelected = [];
  render();
  checkGameState();
  if(!gameOver && mode !== 'pvp' && turn === BLACK) aiMove();
}

// ─── Player Input ──────────────────────────────────────────
function selectSquare(r,c){
  if(gameOver || thinking) return;
  if(mode !== 'pvp' && turn === BLACK) return;
  const p = board[r][c];
  if(selected){
    const move = legalSelected.find(m => m.to.r === r && m.to.c === c);
    if(move){
      const moving = board[move.from.r][move.from.c];
      if(moving.type === 'p' && (move.to.r === 0 || move.to.r === 7)){
        pendingPromotion = move;
        promotionEl.classList.add('show');
        return;
      }
      executeMove(move);
      return;
    }
    if(p && p.color === turn){
      selected = {r,c};
      legalSelected = legalMovesForPiece(board,r,c,turn);
      render();
      return;
    }
    selected = null;
    legalSelected = [];
    render();
    return;
  }
  if(p && p.color === turn){
    selected = {r,c};
    legalSelected = legalMovesForPiece(board,r,c,turn);
    render();
  }
}

// ─── Check Game State ──────────────────────────────────────
function checkGameState(){
  const moves = allLegalMoves(board,turn);
  const check = inCheck(board,turn);
  if(moves.length === 0){
    gameOver = true;
    if(check){
      const winner = opposite(turn) === WHITE ? 'White' : 'Black';
      showResult('👑', 'Checkmate!', winner + ' wins! 🏆');
    } else {
      showResult('🤝', 'Stalemate', 'The game is a draw.');
    }
    return;
  }
  if(halfmove >= 100){ gameOver = true; showResult('🤝', 'Draw', '50-move rule.'); return; }
  const status = check ? '⚠️ CHECK!' : turn === WHITE ? 'White turn' : 'Black turn';
  statusEl.textContent = status;
  messageEl.textContent = check ? '⚠️ King is in danger!' : turn === WHITE ? 'Your turn ♟️' : mode === 'pvp' ? 'Black turn ♟️' : 'AI is thinking... 🧠';
  turnText.textContent = turn === WHITE ? 'White' : 'Black';
}

// ─── AI ─────────────────────────────────────────────────────
function getDepth(){ if(mode === 'easy') return 1; if(mode === 'medium') return 2; if(mode === 'hard') return 3; return 4; }

function evaluateBoard(b){
  let score = 0;
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = b[r][c];
      if(!p) continue;
      let value = VALUE[p.type];
      const centerDist = Math.abs(3.5-r) + Math.abs(3.5-c);
      if(p.type === 'p') value += (p.color === WHITE ? 6-r : r-1) * 8;
      if(p.type === 'n' || p.type === 'b') value += Math.max(0, 20 - centerDist * 5);
      if(p.type === 'q') value += Math.max(0, 12 - centerDist * 2);
      score += p.color === WHITE ? value : -value;
    }
  }
  if(inCheck(b,WHITE)) score -= 45;
  if(inCheck(b,BLACK)) score += 45;
  return score;
}

function moveOrderScore(b,move){
  const attacker = b[move.from.r][move.from.c];
  let score = 0;
  if(move.capture){
    let victim = b[move.to.r][move.to.c];
    if(move.enPassant) victim = {type:'p'};
    if(victim) score += VALUE[victim.type] * 10 - VALUE[attacker.type];
  }
  if(move.castle) score += 40;
  if(attacker.type === 'p'){ if(move.to.r === 0 || move.to.r === 7) score += 800; }
  return score;
}

function orderedMoves(b,color){
  const moves = allLegalMoves(b,color);
  moves.sort((a,z) => moveOrderScore(b,z) - moveOrderScore(b,a));
  return moves;
}

function minimax(b,color,depth,alpha,beta){
  const moves = orderedMoves(b,color);
  if(depth === 0) return evaluateBoard(b);
  if(moves.length === 0){
    if(inCheck(b,color)) return color === WHITE ? -999999 : 999999;
    return 0;
  }
  if(color === WHITE){
    let best = -Infinity;
    for(const move of moves){
      const next = applyMoveToBoard(b,move,'q');
      const value = minimax(next, BLACK, depth-1, alpha, beta);
      best = Math.max(best,value);
      alpha = Math.max(alpha,value);
      if(beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for(const move of moves){
      const next = applyMoveToBoard(b,move,'q');
      const value = minimax(next, WHITE, depth-1, alpha, beta);
      best = Math.min(best,value);
      beta = Math.min(beta,value);
      if(beta <= alpha) break;
    }
    return best;
  }
}

function chooseAIMove(){
  const moves = orderedMoves(board,BLACK);
  if(!moves.length) return null;
  if(mode === 'easy'){
    const scored = moves.map(move => {
      const next = applyMoveToBoard(board,move,'q');
      let score = evaluateBoard(next);
      score += (Math.random()-.5) * 500;
      return {move,score};
    });
    scored.sort((a,b) => a.score-b.score);
    const pool = scored.slice(0, Math.min(5,scored.length));
    return randomChoice(pool).move;
  }
  const depth = getDepth();
  let bestMove = moves[0];
  let bestScore = Infinity;
  for(const move of moves){
    const next = applyMoveToBoard(board,move,'q');
    let score = minimax(next, WHITE, depth-1, -Infinity, Infinity);
    if(mode === 'master'){
      if(move.capture) score -= VALUE[board[move.to.r][move.to.c]?.type || 'p'] * .02;
      if(move.castle) score -= 15;
    }
    if(score < bestScore){ bestScore = score; bestMove = move; }
    else if(Math.abs(score-bestScore) < 15 && Math.random() < .22) bestMove = move;
  }
  return bestMove;
}

function aiMove(){
  if(gameOver || mode === 'pvp' || turn !== BLACK) return;
  thinking = true;
  statusEl.textContent = '🧠 AI thinking...';
  messageEl.textContent = 'AI is calculating the best move... ⚡';
  setTimeout(()=>{
    const move = chooseAIMove();
    thinking = false;
    if(move) executeMove(move);
  }, mode === 'master' ? 100 : 70);
}

// ─── Render ─────────────────────────────────────────────────
function render(){
  boardEl.innerHTML = '';
  for(let displayR=0;displayR<8;displayR++){
    for(let displayC=0;displayC<8;displayC++){
      const r = flipped ? 7-displayR : displayR;
      const c = flipped ? 7-displayC : displayC;
      const el = document.createElement('div');
      el.className = 'square ' + ((r+c)%2===0 ? 'light' : 'dark');
      if(selected && selected.r === r && selected.c === c) el.classList.add('selected');
      const king = board[r][c];
      if(king && king.type === 'k' && king.color === turn && inCheck(board,turn)) el.classList.add('check');
      const move = legalSelected.find(m => m.to.r === r && m.to.c === c);
      if(move){
        if(board[r][c] || move.enPassant){
          const ring = document.createElement('div');
          ring.className = 'captureRing';
          el.appendChild(ring);
        } else {
          const dot = document.createElement('div');
          dot.className = 'moveDot';
          el.appendChild(dot);
        }
      }
      if(board[r][c]){
        const piece = document.createElement('div');
        piece.className = 'piece ' + board[r][c].color;
        piece.textContent = PIECES[board[r][c].color][board[r][c].type];
        el.appendChild(piece);
      }
      if(displayC === 7){
        const coord = document.createElement('span');
        coord.className = 'coord file';
        coord.textContent = FILES[c];
        el.appendChild(coord);
      }
      if(displayR === 0){
        const coord = document.createElement('span');
        coord.className = 'coord rank';
        coord.textContent = 8-r;
        el.appendChild(coord);
      }
      el.addEventListener('pointerdown', e=>{ e.preventDefault(); selectSquare(r,c); });
      boardEl.appendChild(el);
    }
  }
  turnText.textContent = turn === WHITE ? 'White' : 'Black';
  moveText.textContent = history.length;
  modeText.textContent = mode === 'pvp' ? '2 Player' : mode.charAt(0).toUpperCase() + mode.slice(1);
  capturedEl.textContent = '⚪ ' + captured.w.map(p=>PIECES[p.color][p.type]).join(' ') + '    ⚫ ' + captured.b.map(p=>PIECES[p.color][p.type]).join(' ');
  if(!gameOver){
    if(turn === BLACK && mode !== 'pvp') statusEl.textContent = thinking ? '🧠 Thinking...' : 'Black';
    else statusEl.textContent = turn === WHITE ? 'White turn' : 'Black turn';
  }
}

// ─── New Game ──────────────────────────────────────────────
function resetGame(){
  board = createInitialBoard();
  turn = WHITE;
  selected = null;
  legalSelected = [];
  history = [];
  gameOver = false;
  thinking = false;
  pendingPromotion = null;
  castle = { w:{k:true,q:true}, b:{k:true,q:true} };
  enPassant = null;
  halfmove = 0;
  fullmove = 1;
  captured = { w:[], b:[] };
  overlay.classList.remove('show');
  promotionEl.classList.remove('show');
  messageEl.textContent = mode === 'pvp' ? 'White starts first ♙' : 'White starts first. Good luck! 🦇';
  render();
}

function showResult(icon,title,text){
  resultIcon.textContent = icon;
  resultTitle.textContent = title;
  resultText.textContent = text;
  setTimeout(()=>{ overlay.classList.add('show'); },200);
}

// ─── Undo ──────────────────────────────────────────────────
function undo(){
  if(!history.length || thinking) return;
  if(mode !== 'pvp' && turn === WHITE && history.length >= 2){
    history.pop();
    const state = history.pop();
    restoreState(state);
  } else {
    const state = history.pop();
    restoreState(state);
  }
  gameOver = false;
  overlay.classList.remove('show');
  render();
  checkGameState();
}

// ─── Promotion ─────────────────────────────────────────────
document.querySelectorAll('.promo').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(!pendingPromotion) return;
    const type = btn.dataset.piece;
    const move = pendingPromotion;
    pendingPromotion = null;
    promotionEl.classList.remove('show');
    executeMove(move,type);
  });
});

// ─── Controls ──────────────────────────────────────────────
document.getElementById('newGame').addEventListener('click', resetGame);
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('flip').addEventListener('click', ()=>{ flipped = !flipped; render(); });
document.getElementById('resign').addEventListener('click', ()=>{
  if(gameOver) return;
  gameOver = true;
  showResult('🏳️', 'Resign', turn === WHITE ? 'White resigned. Black wins!' : 'Black resigned. White wins!');
});
modeEl.addEventListener('change', ()=>{ mode = modeEl.value; resetGame(); });
document.querySelectorAll('.modeBtn[data-mode]').forEach(btn=>{
  btn.addEventListener('click',()=>{ mode = btn.dataset.mode; modeEl.value = mode; resetGame(); });
});
document.getElementById('playAgain').addEventListener('click', resetGame);

// ─── Keyboard ──────────────────────────────────────────────
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){ selected = null; legalSelected = []; render(); }
  if(e.key.toLowerCase() === 'r') resetGame();
  if(e.key.toLowerCase() === 'u') undo();
});

// ─── Start ──────────────────────────────────────────────────
mode = 'medium';
modeEl.value = mode;
resetGame();
</script>

</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break

case "flappy": {
if (!isBot) return
try {
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Flappy Bat</title>
<style>
:root{
  --bg:#08070b;
  --line:rgba(255,255,255,.09);
  --text:#fff;
  --muted:#aaa1ae;
  --gold:#ffd700;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;padding:0;background:radial-gradient(circle at top,#1a0a0a 0%,#0b080d 45%,#050407 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
body{min-height:100vh;padding:12px;}
.app{width:min(100%,420px);margin:auto;}
.header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
.brand{display:flex;align-items:center;gap:10px;}
.avatar{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid var(--gold);font-size:19px;}
.title{font-size:16px;font-weight:800;color:var(--gold);}
.score{font-size:13px;color:var(--muted);}
.stage{
  position:relative;
  width:100%;
  aspect-ratio:3/4;
  border-radius:16px;
  overflow:hidden;
  border:1px solid var(--line);
  background:linear-gradient(180deg,#1c1626 0%,#0d0a13 100%);
  touch-action:none;
}
canvas{position:absolute;inset:0;width:100%;height:100%;}
.overlay{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
  background:rgba(0,0,0,.55);
  text-align:center;
  padding:20px;
}
.overlay.hidden{display:none;}
.overlay h2{margin:0;color:var(--gold);font-size:20px;}
.overlay p{margin:0;color:var(--muted);font-size:13px;}
.startBtn{
  margin-top:6px;
  padding:11px 22px;
  border-radius:12px;
  border:1px solid var(--gold);
  background:rgba(255,215,0,.1);
  color:var(--gold);
  font-weight:700;
  font-size:14px;
  cursor:pointer;
}
.hint{margin-top:8px;font-size:11px;color:var(--muted);text-align:center;}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="brand">
      <div class="avatar">🦇</div>
      <div class="title">Flappy Bat</div>
    </div>
    <div class="score" id="scoreLabel">Score: 0 · Best: 0</div>
  </div>

  <div class="stage" id="stage">
    <canvas id="game"></canvas>
    <div class="overlay" id="overlay">
      <h2>Flappy Bat</h2>
      <p>Tap to flap. Gaps are wide — take it easy.</p>
      <button class="startBtn" id="startBtn">▶️ Start</button>
    </div>
  </div>

  <div class="hint">Tap anywhere on the screen to flap</div>
</div>

<script>
'use strict';
const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const scoreLabel = document.getElementById('scoreLabel');

let dpr = window.devicePixelRatio || 1;
let W = 0, H = 0;

function resize(){
  const rect = stage.getBoundingClientRect();
  W = rect.width;
  H = rect.height;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resize);

// ─── Tuning: kept gentle on purpose ─────────────────────────
const GRAVITY = 0.28;
const FLAP_STRENGTH = -6.2;
const MAX_FALL = 6.5;
const PIPE_GAP_RATIO = 0.42;
const PIPE_SPEED = 1.7;
const PIPE_SPACING = 260;
const BIRD_X_RATIO = 0.28;
const BIRD_RADIUS = 14;

let bird = { y: 0, vy: 0 };
let pipes = [];
let score = 0;
let best = 0;
let running = false;
let frame = 0;
let particles = [];

function resetGame(){
  bird = { y: H/2, vy: 0 };
  pipes = [];
  score = 0;
  frame = 0;
  particles = [];
  spawnPipe(W + 100);
}

function spawnPipe(x){
  const gap = H * PIPE_GAP_RATIO;
  const margin = 50;
  const gapY = margin + Math.random() * (H - margin*2 - gap);
  pipes.push({ x, gapY, gap, passed: false });
}

function flap(){
  if(!running) return;
  bird.vy = FLAP_STRENGTH;
  for(let i=0;i<4;i++){
    particles.push({
      x: W*BIRD_X_RATIO - BIRD_RADIUS*0.6,
      y: bird.y + (Math.random()-0.5)*8,
      vx: -1.5 - Math.random(),
      vy: (Math.random()-0.5)*1.5,
      life: 1
    });
  }
}

stage.addEventListener('pointerdown', e=>{
  e.preventDefault();
  flap();
});

function update(){
  frame++;
  bird.vy += GRAVITY;
  bird.vy = Math.min(bird.vy, MAX_FALL);
  bird.y += bird.vy;

  pipes.forEach(p => p.x -= PIPE_SPEED);
  if(pipes.length && pipes[0].x < -60){
    pipes.shift();
  }
  const last = pipes[pipes.length-1];
  if(!last || (W - last.x) > PIPE_SPACING){
    spawnPipe(W + 40);
  }

  const birdX = W * BIRD_X_RATIO;
  pipes.forEach(p=>{
    if(!p.passed && p.x + 30 < birdX){
      p.passed = true;
      score++;
    }
    const withinX = birdX + BIRD_RADIUS > p.x && birdX - BIRD_RADIUS < p.x + 46;
    const withinGap = bird.y - BIRD_RADIUS > p.gapY && bird.y + BIRD_RADIUS < p.gapY + p.gap;
    if(withinX && !withinGap){
      endGame();
    }
  });

  if(bird.y + BIRD_RADIUS > H || bird.y - BIRD_RADIUS < 0){
    endGame();
  }

  particles = particles.filter(pt => pt.life > 0);
  particles.forEach(pt=>{
    pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
  });
}

function draw(){
  ctx.clearRect(0,0,W,H);

  ctx.fillStyle = 'rgba(255,215,0,0.9)';
  pipes.forEach(p=>{
    ctx.fillStyle = 'rgba(120,90,180,0.85)';
    ctx.fillRect(p.x, 0, 46, p.gapY);
    ctx.fillRect(p.x, p.gapY + p.gap, 46, H - (p.gapY + p.gap));
    ctx.fillStyle = 'rgba(150,120,210,0.95)';
    ctx.fillRect(p.x-3, p.gapY-14, 52, 14);
    ctx.fillRect(p.x-3, p.gapY+p.gap, 52, 14);
  });

  particles.forEach(pt=>{
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,215,0,'+pt.life+')';
    ctx.fill();
  });

  const birdX = W * BIRD_X_RATIO;
  ctx.save();
  ctx.translate(birdX, bird.y);
  const angle = Math.max(-0.5, Math.min(0.9, bird.vy * 0.08));
  ctx.rotate(angle);
  ctx.font = (BIRD_RADIUS*2.2) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦇', 0, 0);
  ctx.restore();
}

function loop(){
  if(running){
    update();
    draw();
    requestAnimationFrame(loop);
  }
}

function endGame(){
  running = false;
  best = Math.max(best, score);
  scoreLabel.textContent = 'Score: ' + score + ' · Best: ' + best;
  overlay.querySelector('h2').textContent = 'Game over';
  overlay.querySelector('p').textContent = 'Score: ' + score + (score >= best && score > 0 ? ' — new best!' : '');
  startBtn.textContent = '↩️ Try again';
  overlay.classList.remove('hidden');
}

startBtn.addEventListener('click', ()=>{
  resize();
  resetGame();
  running = true;
  overlay.classList.add('hidden');
  loop();
});

resize();
draw();
</script>
</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break

case "calc": {
if (!isBot) return
const expr = commandBody.trim().split(' ').slice(1).join(' ')
if (!expr) { reply('📌 .calc [expression]\nExample: .calc 5*(3+2)'); break }
if (!/^[\d+\-*/().\s%]+$/.test(expr)) { reply('❌ Invalid or unsafe expression.'); break }
try {
    const fn = new Function(`return (${expr})`)
    const result = fn()
    if (typeof result !== 'number' || !isFinite(result)) { reply('❌ Invalid expression.'); break }
    reply(`🧮 ${expr} = *${result}*`)
} catch (e) {
    reply('❌ Invalid expression.')
}
} break

case "bmi": {
if (!isBot) return
const args = commandBody.trim().split(' ').slice(1)
const weight = parseFloat(args[0])
const heightCm = parseFloat(args[1])
if (!weight || !heightCm) { reply('📌 .bmi [weight_kg] [height_cm]\nExample: .bmi 60 165'); break }
const h = heightCm / 100
const bmiVal = weight / (h * h)
let cat
if (bmiVal < 18.5) cat = 'Underweight'
else if (bmiVal < 25) cat = 'Normal'
else if (bmiVal < 30) cat = 'Overweight'
else cat = 'Obese'
reply(`⚖️ *BMI Calculator*\n\nBMI: *${bmiVal.toFixed(1)}*\nCategory: *${cat}*`)
} break

case "password": {
if (!isBot) return
const args = commandBody.trim().split(' ').slice(1)
const length = Math.min(64, Math.max(4, parseInt(args[0]) || 12))
const withSymbols = args[1] === 'symbols'
const lower = 'abcdefghijklmnopqrstuvwxyz'
const upper = lower.toUpperCase()
const nums = '0123456789'
const symbols = '!@#$%^&*()_+-='
let pool = lower + upper + nums
if (withSymbols) pool += symbols
let pw = ''
for (let i = 0; i < length; i++) pw += pool[Math.floor(Math.random() * pool.length)]
reply(`🔑 Password (${length} chars):\n\`${pw}\``)
} break

case "uuid": {
if (!isBot) return
const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
})
reply(`🆔 UUID: \`${uuid}\``)
} break

case "pick": {
if (!isBot) return
const text = commandBody.trim().split(' ').slice(1).join(' ')
const items = text.split(',').map(s => s.trim()).filter(Boolean)
if (items.length < 2) { reply('📌 .pick option1, option2, option3\nSeparate with commas.'); break }
const choice = items[Math.floor(Math.random() * items.length)]
reply(`🎯 Bot picks: *${choice}*`)
} break

case "shuffle": {
if (!isBot) return
const text = commandBody.trim().split(' ').slice(1).join(' ')
const items = text.split(',').map(s => s.trim()).filter(Boolean)
if (items.length < 2) { reply('📌 .shuffle option1, option2, option3\nSeparate with commas.'); break }
const shuffled = [...items].sort(() => Math.random() - 0.5)
reply(`🔀 Shuffled:\n${shuffled.map((s, i) => `${i + 1}. ${s}`).join('\n')}`)
} break

case "quote": {
if (!isBot) return
const QUOTES = [
    'Life is a journey, not a destination.',
    'Failure is the best teacher.',
    "Don't fear failure, fear not trying.",
    'Time is the most valuable thing we have.',
    'Happiness starts with gratitude.',
    'Success comes from hard work and patience.',
    'Dream big, work hard, stay humble.',
    'Every problem has a way out.',
    'Learn from today, live for tomorrow.',
    'Great people are not born, they are shaped.'
]
reply(`💬 _"${QUOTES[Math.floor(Math.random() * QUOTES.length)]}"_`)
} break

case "fact": {
if (!isBot) return
const FACTS = [
    'Honey never spoils if stored properly.',
    "A blue whale's heart is the size of a small car.",
    'Octopuses have three hearts.',
    'The moon moves about 3.8cm away from Earth every year.',
    "Cats can't taste sweetness.",
    'Bees can recognize human faces.',
    "The human brain uses 20% of the body's energy.",
    'Bones are about 5x stronger than steel by weight.',
    'Starfish have no brain.',
    'A day on Venus is longer than its year.'
]
reply(`🧠 *Random Fact:*\n${FACTS[Math.floor(Math.random() * FACTS.length)]}`)
} break

case "truth": {
if (!isBot) return
const TRUTHS = [
    "What's the most embarrassing thing you've ever done?",
    'Who was your first crush?',
    'What did you once lie to your parents about?',
    "What's a secret you've never told anyone?",
    "What's your biggest fear?"
]
reply(`🤔 *TRUTH:*\n${TRUTHS[Math.floor(Math.random() * TRUTHS.length)]}`)
} break

case "dare": {
if (!isBot) return
const DARES = [
    'Send a 10-second voice note of yourself singing!',
    'Change your profile picture to something silly for an hour.',
    'Text a random contact "hey, you\'re awesome".',
    'Post something weird on your WhatsApp status.',
    'Call a friend and say "love you" then hang up.'
]
reply(`🔥 *DARE:*\n${DARES[Math.floor(Math.random() * DARES.length)]}`)
} break

case "riddle": {
if (!isBot) return
const RIDDLES = [
    { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps' },
    { q: 'I have keys but no locks. I have space but no room. What am I?', a: 'keyboard' },
    { q: 'The more you cut me, the bigger I get. What am I?', a: 'hole' },
    { q: 'I have a head and a tail but no body. What am I?', a: 'coin' },
    { q: 'I can travel without moving. What am I?', a: 'time' }
]
const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)]
global.astaRiddles = global.astaRiddles || new Map()
global.astaRiddles.set(from, r.a)
reply(`🧩 *RIDDLE*\n\n${r.q}\n\nAnswer with: *.answer [your answer]*`)
} break

case "answer": {
if (!isBot) return
const ans = commandBody.trim().split(' ').slice(1).join(' ').toLowerCase().trim()
global.astaRiddles = global.astaRiddles || new Map()
const correct = global.astaRiddles.get(from)
if (!correct) { reply('❌ No active riddle. Type *.riddle* first!'); break }
if (ans === correct) {
    global.astaRiddles.delete(from)
    reply('🎉 *CORRECT!* Nicely done!')
} else {
    reply('❌ Wrong, try again!')
}
} break

case "coinflip":
case "dice":
case "rps":
case "arcade": {
if (!isBot) return
try {
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Asta Arcade</title>
<style>
:root{
  --line:rgba(255,255,255,.1);
  --text:#fff;
  --muted:#aaa1ae;
  --gold:#ffd700;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;}
html,body{margin:0;padding:0;background:radial-gradient(circle at top,#1a0a0a 0%,#0b080d 45%,#050407 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
body{min-height:100vh;padding:12px;}
.app{width:min(100%,460px);margin:auto;}
.header{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.avatar{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid var(--gold);font-size:19px;}
.title{font-size:16px;font-weight:800;color:var(--gold);}

.tabs{display:flex;gap:6px;margin-bottom:14px;}
.tab{flex:1;min-height:38px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;}
.tab.active{border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.08);}

.game{display:none;text-align:center;}
.game.active{display:block;}

.stage{min-height:160px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;}

.coin{width:90px;height:90px;border-radius:50%;background:linear-gradient(145deg,#ffe066,#c9960a);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#4a3200;box-shadow:0 8px 24px rgba(255,215,0,.3);}
.coin.flipping{animation:flip 0.9s ease-out;}
@keyframes flip{
  0%{transform:rotateY(0);}
  100%{transform:rotateY(1440deg);}
}

.die{width:80px;height:80px;border-radius:16px;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;box-shadow:0 8px 24px rgba(0,0,0,.4);}
.die.rolling{animation:roll 0.7s ease-out;}
@keyframes roll{
  0%{transform:rotate(0);}
  100%{transform:rotate(720deg);}
}

.rpsRow{display:flex;gap:20px;align-items:center;justify-content:center;}
.rpsHand{font-size:52px;transition:transform .25s;}
.rpsHand.shaking{animation:shake .4s ease-in-out infinite;}
@keyframes shake{
  0%,100%{transform:translateY(0);}
  50%{transform:translateY(-8px);}
}
.vs{font-size:12px;color:var(--muted);}

.actionRow{display:flex;gap:8px;margin-bottom:10px;}
.actionBtn{flex:1;min-height:44px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.045);color:#fff;font-weight:700;font-size:13px;cursor:pointer;}
.actionBtn.primary{border-color:var(--gold);color:var(--gold);}
.actionBtn:disabled{opacity:.4;}

.result{min-height:20px;font-size:13px;color:var(--gold);font-weight:700;text-align:center;margin-bottom:4px;}
.sub{font-size:11px;color:var(--muted);text-align:center;}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="avatar">🎮</div>
    <div class="title">Asta Arcade</div>
  </div>

  <div class="tabs">
    <button class="tab active" data-game="coin">🪙 Coin</button>
    <button class="tab" data-game="dice">🎲 Dice</button>
    <button class="tab" data-game="rps">✊ RPS</button>
  </div>

  <div class="game active" id="game-coin">
    <div class="stage"><div class="coin" id="coinEl">?</div></div>
    <button class="actionBtn primary" id="coinBtn">Flip Coin</button>
    <div class="result" id="coinResult"></div>
  </div>

  <div class="game" id="game-dice">
    <div class="stage"><div class="die" id="diceEl">?</div></div>
    <button class="actionBtn primary" id="diceBtn">Roll Dice</button>
    <div class="result" id="diceResult"></div>
  </div>

  <div class="game" id="game-rps">
    <div class="stage">
      <div class="rpsRow">
        <div class="rpsHand" id="userHand">✊</div>
        <div class="vs">VS</div>
        <div class="rpsHand" id="botHand">✊</div>
      </div>
    </div>
    <div class="actionRow">
      <button class="actionBtn" data-choice="rock">✊ Rock</button>
      <button class="actionBtn" data-choice="paper">✋ Paper</button>
      <button class="actionBtn" data-choice="scissors">✌️ Scissors</button>
    </div>
    <div class="result" id="rpsResult"></div>
  </div>

  <div class="sub">Tap a tab to switch games</div>
</div>

<script>
'use strict';
const tabs = document.querySelectorAll('.tab');
const games = document.querySelectorAll('.game');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    games.forEach(g => g.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('game-' + tab.dataset.game).classList.add('active');
  });
});

// ─── Coin flip ─────────────────────────────────────────────
const coinEl = document.getElementById('coinEl');
const coinBtn = document.getElementById('coinBtn');
const coinResult = document.getElementById('coinResult');

coinBtn.addEventListener('click', () => {
  coinBtn.disabled = true;
  coinEl.classList.remove('flipping');
  void coinEl.offsetWidth;
  coinEl.classList.add('flipping');
  coinEl.textContent = '?';
  coinResult.textContent = '';
  setTimeout(() => {
    const heads = Math.random() < 0.5;
    coinEl.textContent = heads ? 'H' : 'T';
    coinResult.textContent = heads ? '🪙 HEADS!' : '🪙 TAILS!';
    coinBtn.disabled = false;
  }, 900);
});

// ─── Dice roll ─────────────────────────────────────────────
const diceEl = document.getElementById('diceEl');
const diceBtn = document.getElementById('diceBtn');
const diceResult = document.getElementById('diceResult');
const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

diceBtn.addEventListener('click', () => {
  diceBtn.disabled = true;
  diceEl.classList.remove('rolling');
  void diceEl.offsetWidth;
  diceEl.classList.add('rolling');
  diceResult.textContent = '';
  setTimeout(() => {
    const roll = Math.floor(Math.random() * 6) + 1;
    diceEl.textContent = DICE_FACES[roll];
    diceResult.textContent = '🎲 Rolled: ' + roll;
    diceBtn.disabled = false;
  }, 700);
});

// ─── RPS ───────────────────────────────────────────────────
const userHand = document.getElementById('userHand');
const botHand = document.getElementById('botHand');
const rpsResult = document.getElementById('rpsResult');
const rpsButtons = document.querySelectorAll('[data-choice]');
const HAND_ICON = { rock: '✊', paper: '✋', scissors: '✌️' };

rpsButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    rpsButtons.forEach(b => b.disabled = true);
    const user = btn.dataset.choice;
    userHand.textContent = HAND_ICON[user];
    botHand.classList.add('shaking');
    rpsResult.textContent = '';

    setTimeout(() => {
      const choices = ['rock', 'paper', 'scissors'];
      const bot = choices[Math.floor(Math.random() * 3)];
      botHand.classList.remove('shaking');
      botHand.textContent = HAND_ICON[bot];

      let outcome;
      if (user === bot) outcome = '🤝 TIE!';
      else if (
        (user === 'rock' && bot === 'scissors') ||
        (user === 'scissors' && bot === 'paper') ||
        (user === 'paper' && bot === 'rock')
      ) outcome = '🎉 YOU WIN!';
      else outcome = '😢 YOU LOSE!';

      rpsResult.textContent = outcome;
      rpsButtons.forEach(b => b.disabled = false);
    }, 800);
  });
});
</script>
</body>
</html>`;

const gameData = {
    botForwardedMessage: {
        message: {
            richResponseMessage: {
                messageType: 1,
                unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                        __typename: "GenAIUnifiedResponse",
                        response_id: crypto.randomUUID(),
                        sections: [{
                            __typename: "GenAIUnifiedResponseSection",
                            view_model: {
                                __typename: "GenAISingleLayoutViewModel",
                                primitive: {
                                    __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                    trusted_sources: [],
                                    payload: html
                                }
                            }
                        }]
                    })).toString("base64")
                },
                contextInfo: {
                    isForwarded: true,
                    forwardOrigin: 4
                }
            }
        }
    }
}

const msg = await generateWAMessageFromContent(from, gameData, {})
await snowi.relayMessage(from, msg.message, { messageId: msg.key.id })

} catch (e) {
    console.log(util.format(e))
    reply(`❌ Error: ${e.message}`)
}
} break

case "tools": {
if (!isBot) return
await snowi.richMenu(from, {
header: {
    disclaimer: true,
    disclaimerText: "By AstaTech",
    title: "Asta Tools"
},
body: {
carousel: true,
cards: [
    {
    title: "🧮 Calculator",
    buttons: ["calc"],
    toast: "Solve a math expression: .calc 5*(3+2)"
    },
    {
    title: "⚖️ BMI",
    buttons: ["bmi"],
    toast: "Check your BMI: .bmi weight_kg height_cm"
    },
    {
    title: "🔑 Password",
    buttons: ["password"],
    toast: "Generate a random password"
    },
    {
    title: "🆔 UUID",
    buttons: ["uuid"],
    toast: "Generate a random UUID"
    },
    {
    title: "🎯 Pick",
    buttons: ["pick"],
    toast: "Let the bot pick from your options"
    },
    {
    title: "🔀 Shuffle",
    buttons: ["shuffle"],
    toast: "Shuffle a list of options"
    }
]
},
footer: {
text: "Type a command to launch it"
}
})
await sendMenuAudio()
} break

case "fun": {
if (!isBot) return
await snowi.richMenu(from, {
header: {
    disclaimer: true,
    disclaimerText: "By AstaTech",
    title: "Asta Fun"
},
body: {
carousel: true,
cards: [
    {
    title: "🎮 Arcade",
    buttons: ["arcade"],
    toast: "Animated coin flip, dice, and rock-paper-scissors"
    },
    {
    title: "💬 Quote",
    buttons: ["quote"],
    toast: "Get a random quote"
    },
    {
    title: "🧠 Fact",
    buttons: ["fact"],
    toast: "Get a random fun fact"
    },
    {
    title: "🤔 Truth or Dare",
    buttons: ["truth", "dare"],
    toast: "Classic truth or dare prompts"
    },
    {
    title: "🧩 Riddle",
    buttons: ["riddle"],
    toast: "Solve a riddle, then reply with .answer"
    }
]
},
footer: {
text: "Type a command to launch it"
}
})
await sendMenuAudio()
} break

case "football": {
if (!isBot) return
try {
    const response = await fetch('https://prexzyapis.com/sports/football')
    const data = await response.json()

    if(!data || !data.status || !data.data || !Array.isArray(data.data.matches)){
        reply('⚽ Could not load football data right now — the source might be down. Try again in a bit.')
        break
    }

    const matches = data.data.matches
    if(matches.length === 0){
        reply('⚽ No matches found right now.')
        break
    }

    function statusLabel(state){
        if(state === 0) return '🕒 Upcoming'
        if(state === -1) return '✅ Finished'
        return '🔴 Live'
    }

    const lines = matches.slice(0, 15).map(m => {
        const status = statusLabel(m.state)
        return `${status} · ${m.leagueEn}\n${m.homeName} ${m.homeScore} - ${m.awayScore} ${m.awayName}`
    })

    const header = `⚽ *Football Scores* (${matches.length} matches)\n\n`
    reply(header + lines.join('\n\n'))

} catch (e) {
    console.log(util.format(e))
    reply('⚽ Something went wrong fetching football scores. Try again shortly.')
}
} break

case "instagram": {
if (!isBot) return
const url = commandBody.trim().split(' ').slice(1).join(' ')
if (!url) { reply('📌 .instagram [instagram link]'); break }
try {
    const response = await fetch('https://prexzyapis.com/download/instagram?url=' + encodeURIComponent(url))
    const data = await response.json()

    // Response shape unconfirmed — this endpoint blocked test requests during
    // development. Handling a few likely shapes; if it fails, check the real
    // JSON with console.log(data) and adjust the extraction below.
    const result = data?.data || data?.result || data
    const mediaUrl = result?.url || result?.download_url || result?.video || result?.[0]?.url

    if (!data || (data.status === false) || !mediaUrl) {
        reply('📷 Could not fetch that Instagram link. It may be private, invalid, or the source is down.')
        break
    }

    await snowi.sendMessage(from, { video: { url: mediaUrl }, caption: '📷 Instagram download' })

} catch (e) {
    console.log(util.format(e))
    reply('📷 Something went wrong downloading that. Try again shortly.')
}
} break

case "instagram2": {
if (!isBot) return
const args = commandBody.trim().split(' ').slice(1)
const url = args.filter(a => !a.startsWith('type=')).join(' ')
const typeArg = args.find(a => a.startsWith('type='))
const type = typeArg ? typeArg.split('=')[1] : ''
if (!url) { reply('📌 .instagram2 [instagram link] [type=optional]'); break }
try {
    let endpoint = 'https://prexzyapis.com/download/igv2?url=' + encodeURIComponent(url)
    if (type) endpoint += '&type=' + encodeURIComponent(type)
    const response = await fetch(endpoint)
    const data = await response.json()

    // Response shape unconfirmed — same caveat as .instagram above.
    const result = data?.data || data?.result || data
    const mediaUrl = result?.url || result?.download_url || result?.video || result?.[0]?.url

    if (!data || (data.status === false) || !mediaUrl) {
        reply('📷 Could not fetch that Instagram link (v2). It may be private, invalid, or the source is down.')
        break
    }

    await snowi.sendMessage(from, { video: { url: mediaUrl }, caption: '📷 Instagram download (v2)' })

} catch (e) {
    console.log(util.format(e))
    reply('📷 Something went wrong downloading that. Try again shortly.')
}
} break

case "tiktok": {
if (!isBot) return
const url = commandBody.trim().split(' ').slice(1).join(' ')
if (!url) { reply('📌 .tiktok [tiktok link]'); break }
try {
    const response = await fetch('https://prexzyapis.com/download/tiktokslide?url=' + encodeURIComponent(url))
    const data = await response.json()

    // Response shape unconfirmed — this endpoint blocked test requests during
    // development. "tiktokslide" in the URL suggests it may return an array of
    // slide images for slideshow posts, or a single video URL for normal posts.
    const result = data?.data || data?.result || data
    const images = result?.images || result?.slides || (Array.isArray(result) ? result : null)
    const videoUrl = result?.url || result?.download_url || result?.video

    if (!data || (data.status === false) || (!videoUrl && !images)) {
        reply('🎵 Could not fetch that TikTok link. It may be private, invalid, or the source is down.')
        break
    }

    if (videoUrl) {
        await snowi.sendMessage(from, { video: { url: videoUrl }, caption: '🎵 TikTok download' })
    } else if (images && images.length) {
        for (const img of images.slice(0, 10)) {
            const imgUrl = typeof img === 'string' ? img : (img.url || img.download_url)
            if (imgUrl) await snowi.sendMessage(from, { image: { url: imgUrl } })
        }
    }

} catch (e) {
    console.log(util.format(e))
    reply('🎵 Something went wrong downloading that. Try again shortly.')
}
} break

case "play": {
if (!isBot) return
const query = commandBody.trim().split(' ').slice(1).join(' ')
if (!query) { reply('📌 .play [youtube link or song name]'); break }
try {
    const response = await fetch('https://prexzyapis.com/download/ytmp3?url=' + encodeURIComponent(query))
    const data = await response.json()

    // Response shape unconfirmed — this endpoint returned 400 on every test
    // request during development, including with no query at all, which
    // suggests it may reject non-browser requests. Needs live testing.
    const result = data?.data || data?.result || data
    const audioUrl = result?.url || result?.download_url || result?.audio

    if (!data || (data.status === false) || !audioUrl) {
        reply('🎧 Could not fetch that audio. The link may be invalid or the source is down.')
        break
    }

    const title = result?.title || 'Audio'
    await snowi.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', caption: `🎧 ${title}` })

} catch (e) {
    console.log(util.format(e))
    reply('🎧 Something went wrong downloading that. Try again shortly.')
}
} break

case "spotify": {
if (!isBot) return
const url = commandBody.trim().split(' ').slice(1).join(' ')
if (!url) { reply('📌 .spotify [spotify track link]'); break }
try {
    const response = await fetch('https://prexzyapis.com/download/spotify?url=' + encodeURIComponent(url))
    const data = await response.json()

    // Response shape unconfirmed — same caveat as .play above.
    const result = data?.data || data?.result || data
    const audioUrl = result?.url || result?.download_url || result?.audio

    if (!data || (data.status === false) || !audioUrl) {
        reply('🎧 Could not fetch that Spotify track. The link may be invalid or the source is down.')
        break
    }

    const title = result?.title || result?.name || 'Track'
    const artist = result?.artist || result?.artists || ''
    await snowi.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', caption: `🎧 ${title}${artist ? ' — ' + artist : ''}` })

} catch (e) {
    console.log(util.format(e))
    reply('🎧 Something went wrong downloading that. Try again shortly.')
}
} break

default:

}
    } catch (e) {
        console.log(util.format(e))
    }
}

let file = require.resolve(__filename)

fs.watchFile(file, { interval: 500 }, () => {
    fs.unwatchFile(file)
    delete require.cache[file]
    console.log(`Update ${__filename}`)
})
