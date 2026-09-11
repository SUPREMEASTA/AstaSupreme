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
    MakeInMemoryStore,
    Browsers,
    proto,
} = require('./consts.js')

const dir = (relPath) => path.join(__dirname, relPath)

// const tempPollStore = []
const tempPollStore = []

const isUrl = function (str) {
    return (str.startsWith('http://') || str.startsWith('https://'))
}

const resolveSource = async function (input) {
    if (this.isUrl(input)) return input
    const resolved = path.resolve(this.mainPath, input)
    if (!fs.existsSync(resolved)) {
        return console.log(`Not found: ${resolved}`)
    }
    return resolved
}

const getMessage = async function (key) {
    try {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id)
            return msg
        }
        return {
            conversation: "Snowi",
        }
    } catch (e) {}
}

const decodeJid = function (jid) {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {}
        return decode.user && decode.server && decode.user + '@' + decode.server || jid
    } else return jid
}

const sendjson = async function (target, json = {}, config = {}) {
    var msg = generateWAMessageFromContent(target, json, {})
    let xxx = target
    return this.relayMessage(xxx, msg.message, { messageId: msg.key.id, ...config })
}

const quote = async function (target, json = {}, cfg = {}) {
    this.sendjson(target, {
        "extendedTextMessage": {
            "text": "Quoted test",
            "contextInfo": {
                "quotedMessage": json,
                "remoteJid": "status@broadcast",
                "participant": "13135550000@s.whatsapp.net"
            }
        }
    }, cfg)
}

const makeFakeCommand = async function (m, text, chatUpdate) {
    let x = {}
    x.chat = m.key.remoteJid
    x.fromMe = m.key.fromMe
    if ((m.key?.participant?.endsWith("@lid")) & (m.key?.participant === this.user.lid)) {
        x.sender = this.user.lid
    } else {
        x.sender = this.decodeJid(x.fromMe && this.user.id || x.participant || m.key.participant || x.chat || '')
    }
    //console.log(JSON.stringify(chatUpdate))
    m.sender = x.sender
    let recipient
    if (m.key.remoteJid?.includes(":")) {
        recipient = m.key.remoteJid.split(":")[0] + "@lid"
    } else {
        recipient = m.key.remoteJid
    }
    let messages = await generateWAMessageFromContent(recipient,
        { extendedTextMessage: { text: text || '' } }, {}
    )
    messages.key.fromMe = true
    messages.key.id = 'INTERNAL-CMD'
    messages.pushName = m.pushName
    if (chatUpdate) {
        messages.key.participant = chatUpdate[0]?.update?.pollUpdates[0]?.pollUpdateMessageKey?.participant || ""
    }
    //    console.log(JSON.stringify(messages, null, 4))
    let msg = {
        messages: [messages],
        type: "append",
    }
    return this.ev.emit("messages.upsert", msg)
}

const pollMenu = async function (jid, name = '', pollOptions = [], context = {}, selectableCount = 1) {
    const values = pollOptions.map(o => o.vote)
    const pollMsg = await this.sendMessage(jid, {
        poll: { name, values, selectableCount }
    })
    this.tempPollStore.push({ id: pollMsg.key.id, cmds: pollOptions })
    return
}

const downloadMediaMessage = async function (message) {
    let mime = (message.msg || message).mimetype || ''
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    const stream = await downloadContentFromMessage(message, messageType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}

const sendAlbumMessage = async function (target, media = [], contextInfo = {}) {
    const isUrl = (str) => typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'))

    const resolveSource = async (inputPath) => {
        if (isUrl(inputPath)) return inputPath
        const base = global.projectRoot || process.cwd()
        const resolved = require('path').resolve(base, inputPath)
        if (!require('fs').existsSync(resolved)) {
            console.log(`File not found: ${resolved}`)
            return null
        }
        return resolved
    }

    const albumMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
        albumMessage: {
            expectedImageCount: 1,
            expectedVideoCount: 1,
            contextInfo
        }
    }), {})

    const albumKey = {
        id: await this.relayMessage(target, albumMsg.message, { messageId: albumMsg.key.id }),
        remoteJid: target,
        fromMe: true
    }

    const keys = { album: albumKey }
    let i = 1

    for (const medi of media) {
        const ext = medi.split('.').pop().toLowerCase()
        const mimetypes = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4'
        }
        const messagetypes = {
            jpg: 'imageMessage', jpeg: 'imageMessage', png: 'imageMessage',
            gif: 'imageMessage', webp: 'imageMessage', mp4: 'videoMessage'
        }

        const mimetype = mimetypes[ext]
        const type = messagetypes[ext]

        if (!mimetype || !type) {
            console.log(`Invalid filetype: ${medi}`)
            continue
        }

        const source = await resolveSource(medi)
        if (!source) continue

        const msg = await prepareWAMessageMedia(
            { [type.startsWith('image') ? 'image' : 'video']: { url: source }, mimetype },
            { upload: this.waUploadToServer }
        )

        const mediaMessage = generateWAMessageFromContent(target, proto.Message.fromObject({
            associatedChildMessage: {
                message: {
                    messageContextInfo: {
                        messageSecret: require('crypto').randomBytes(32),
                        messageAssociation: {
                            associationType: 'MEDIA_ALBUM',
                            parentMessageKey: albumKey
                        }
                    },
                    [type]: { ...msg[type] }
                }
            }
        }), {})

        keys[`media_${i++}`] = {
            id: await this.relayMessage(target, mediaMessage.message, { messageId: mediaMessage.key.id }),
            fromMe: true,
            remoteJid: target
        }
    }

    return keys
}

const statusMention = async function (target, content) {
    try {
        const media = await generateWAMessageFromContent(target, content, {})

        const additionalNodes = [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined,
                            }
                        ],
                    }
                ],
            }
        ]

        await this.relayMessage("status@broadcast", media.message, {
            "messageId": media.key.id,
            "statusJidList": [target, this.user.id],
            additionalNodes,
        })

        let type
        var SmM = generateWAMessageFromContent(target, proto.Message.fromObject({
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: media.key,
                        type: "STATUS_MENTION_MESSAGE",
                        timestamp: Date.now() * 1000,
                    },
                },
            }
        }), {})

        /*
        Optional

        await this.relayMessage(target, SmM.message, {
        additionalNodes: [
            {
                tag: "meta",
                attrs: { is_status_mention: "true" },
                content: undefined,
            }
        ],
        });*/
        return media
    } catch (e) {
        console.log("error: " + e)
    }
}


const richMenu = async function (target, content = {}) {
    let header = content?.header
    let body = content?.body
    let footer = content?.footer
    let dihh = {}
    let sex = []

    if (header) {
    const {
        disclaimer = false,
        disclaimerText = " ",
        image = { inline: false },
        title = ""
    } = header ?? {}

    if (disclaimer) {
        dihh = {
        messageContextInfo: {
            botMetadata: {
            messageDisclaimerText: disclaimerText
            }
        }
        }
    }

    if (title) {
        sex.push({
        __typename: "GenAIUnifiedResponseSection",
        view_model: {
            __typename: "GenAISingleLayoutViewModel",
            primitive: {
            __typename: "FOATextPrimitive",
            text: "# " + title
            }
        }
        })
    }

    if (image?.url) {
        if (image?.inline) {
        sex.push({
            __typename: "GenAIUnifiedResponseSection",
            view_model: {
            __typename: "GenAISingleLayoutViewModel",
            primitive: {
                __typename: "GenAIMarkdownTextUXPrimitive",
                text: "{{header}}.{{/header}}",
                inline_entities: [
                {
                    __typename: "GenAITextInlineEntity",
                    key: "header",
                    metadata: {
                    __typename: "GenAILatexItem",
                    latex_expression: ".",
                    font_height: 24,
                    padding: 4,
                    latex_image: {
                        __typename: "GenAIMediaItem",
                        mime_type: image.mime_type || "image/png",
                        url: image.url,
                        url_fallback: image.url,
                        width: image.width || 500,
                        height: image.height || 500,
                        expiration_timestamp_ms: Date.now() + 86400000
                    }
                    }
                }
                ]
            }
            }
        })
        } else {
        sex.push({
            __typename: "GenAIUnifiedResponseSection",
            view_model: {
            __typename: "GenAISingleLayoutViewModel",
            primitive: {
                __typename: "GenAIImagePrimitive",
                preview_image: {
                __typename: "GenAIMediaItem",
                mime_type: image.mime_type || "image/png",
                url: image.url
                },
                full_image: {
                __typename: "GenAIMediaItem",
                mime_type: image.mime_type || "image/png",
                url: image.url
                }
            }
            }
        })
        }
    }
    }

if (body) {
    const {
    cards = null,
    buttons = null,
    title = "",
    toast = "",
    carousel = false,
    row = false,
    } = body ?? {}

    if (carousel || row) {
    if (cards?.length >= 1) {
        sex.push({
        __typename: "GenAIUnifiedResponseSection",
        view_model: {
            primitives: cards.map((card, cardIndex) => ({
            __typename: "GenAI3PExtWidgetPrimitive",
            header: {
                __typename: "GenAI3PExtWidgetStandardHeader",
                title: card?.title || ""
            },
            body: {
                __typename: "GenAI3PExtCalendarEventList",
                ctas: (card?.buttons || []).map((text, buttonIndex) => ({
                label: text,
                state: "PENDING",
                kind: "OTHER",
                tool_call_id: `${cardIndex}${buttonIndex}`,
                toast: {
                    label: card?.toast || "",
                    __typename: "GenAI3PExtWidgetToast"
                },
                __typename: "GenAI3PExtWidgetCTA"
                })),
                sections: []
            }
            })),
            __typename: carousel ?"GenAIHScrollLayoutViewModel" : "GenAIActionRowLayoutViewModel"
        }
        })
    }
    } else if (buttons?.length) {
    sex.push({
        __typename: "GenAIUnifiedResponseSection",
        view_model: {
        primitive: {
            __typename: "GenAI3PExtWidgetPrimitive",
            header: {
            __typename: "GenAI3PExtWidgetStandardHeader",
            title: title || ""
            },
            body: {
            __typename: "GenAI3PExtCalendarEventList",
            ctas: buttons.map((text, buttonIndex) => ({
                label: text,
                state: "PENDING",
                kind: "OTHER",
                tool_call_id: `${buttonIndex}`,
                toast: {
                label: toast,
                __typename: "GenAI3PExtWidgetToast"
                },
                __typename: "GenAI3PExtWidgetCTA"
            })),
            sections: []
            }
        },
        __typename: "GenAISingleLayoutViewModel"
        }
    })
    }
}

    if (footer) {
    const {
        text = "",
        url = "",
        image = {}
    } = footer ?? {}
    let img = []
    if (image?.url) {
        img.push({
                __typename: "GenAIMarkdownTextUXPrimitive",
                text: "{{header}}.{{/header}}",
                inline_entities: [
                {
                    __typename: "GenAITextInlineEntity",
                    key: "header",
                    metadata: {
                    __typename: "GenAILatexItem",
                    latex_expression: ".",
                    font_height: 24,
                    padding: -5,
                    latex_image: {
                        __typename: "GenAIMediaItem",
                        mime_type: image.mime_type || "image/png",
                        url: image.url,
                        url_fallback: image.url,
                        width: image.width || 100,
                        height: image.height || 100,
                        expiration_timestamp_ms: Date.now() + 86400000
                    }
                    }
                }
                ]
            })
    }
    sex.push({
        view_model: {
        primitives: [
            {
            cta_text: text || "Tg",
            cta_type: "OPEN_URL",
            cta_url: url || "t.me/thesatanicmirror",
            __typename: "GenAIFooterActionPrimitive"
            },
            ...img
        ],
        __typename: "GenAIActionRowLayoutViewModel"
        }
    })
    }

    return this.sendjson(target, {
    ...dihh,
    richResponseMessage: {
        unifiedResponse: {
        data: Buffer.from(JSON.stringify({
            sections: sex
        })).toString("base64")
        },
        contextInfo: content?.contextInfo ?? {}
    }
    })
}



module.exports = {
    getMessage,
    decodeJid,
    makeFakeCommand,
    pollMenu,
    downloadMediaMessage,
    tempPollStore,
    statusMention,
    sendAlbumMessage,
    isUrl,
    sendjson,
    resolveSource,
    richMenu,
}
