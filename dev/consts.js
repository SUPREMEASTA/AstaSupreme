const fs = require('fs');
const util = require('util');
const chalk = require('chalk');
const moment = require('moment-timezone');
const pino = require('pino');
const logger = pino({ level: 'debug' });
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');
const yargs = require('yargs/yargs');
const _ = require('lodash');
const { Boom } = require('@hapi/boom');
const settingsPath = './setting.js'
const settings = require(settingsPath)
const {
  default: makeWASocket,
  generateWAMessageFromContent,
  getAggregateVotesInPollMessage,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  useMultiFileAuthState,
  generateWAMessage,
  DisconnectReason,
  areJidsSameUser,
  getContentType,
  decryptPollVote,
  relayMessage,
  jidDecode,
  makeInMemoryStore,
  Browsers,
  proto,
  useSqliteAuthState
} = require('@vansnowi/baileys');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const store = makeInMemoryStore({
  logger: pino().child({ level: 'silent', stream: 'store' })
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (text) => new Promise(resolve => rl.question(text, resolve));

        global.grplog = settings.grplog
        global.totallog = settings.totallog
        global.logColor = settings.logColor || "\x1b[31m"
        global.shapeColor = settings.shapeColor || "\x1b[31m"
        global.rootColor = settings.rootColor || "\x1b[31m"
        global.root = settings.root || "┏━━[ A. Painter 88 ]\n┗━<$>"
        global.hideNumber = settings.hideNumber || false

        function log(messageLines, title) {
            const top = `\n${shapeColor}` + "╭" + "─".repeat(50) + "╮" + "\x1b[0m"
            const bottom = `${shapeColor}╰` + "─".repeat(50) + "╯" + "\x1b[0m"
            const emptyLine = `${shapeColor}│` + " ".repeat(50) + "│" + "\x1b[0m"

            console.log(top)

            if (title) {
                const strip = title.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                const titleLine = `${shapeColor}│` + " " + `${logColor}` +
                    strip.padEnd(48) + " " + `${shapeColor}│`
                console.log(titleLine)
                console.log(emptyLine)
            }

            messageLines.forEach((line, i) => {
                if (line.startsWith("\x1b")) {
                    const strip = line.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                    let formattedLine = `${shapeColor}│${logColor}` + ` ${i + 1} ` + `${strip.padEnd(51)}` + " " + `${shapeColor}│` + "\x1b[0m"
                    console.log(formattedLine)
                } else {
                    const strip = line.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                    let formattedLine = `${shapeColor}│${logColor}` + ` ${i + 1} ` + `${strip.padEnd(46)}` + " " + `${shapeColor}│` + "\x1b[0m"
                    console.log(formattedLine)
                }
            })

            console.log(emptyLine)
            console.log(bottom + "\n\n")
        }
module.exports = {
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
  prepareWAMessageMedia,
  useMultiFileAuthState,
  generateWAMessage,
  DisconnectReason,
  areJidsSameUser,
  getContentType,
  decryptPollVote,
  relayMessage,
  jidDecode,
  makeInMemoryStore,
  Browsers,
  proto,
  useSqliteAuthState,
  log
};
