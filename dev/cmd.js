const fs = require('fs')
const path = require('path')

const settingsPath = path.join(__dirname, 'setting.js')
let settings = require(settingsPath)

global.logColor = settings.logColor || "\x1b[31m"
global.shapeColor = settings.shapeColor || "\x1b[31m"
global.rootColor = settings.rootColor || "\x1b[31m"
global.root = settings.root || ":[ C.M.D ]: "
global.hideNumber = settings.hideNumber || false

module.exports = async (command, snowi, rl, callback) => {
    try {
        updateSettings('totallog', false)

        function updateSettings(settingKey, value) {
            settings[settingKey] = value
            fs.writeFileSync(
                settingsPath,
                `module.exports = ${JSON.stringify(settings, null, 2)};`,
                'utf8'
            )
            global[settingKey] = value
        }

        function logMenu(options) {
            console.log(`\n${title}\n`)
            options.forEach((opt, i) => console.log(`(${i + 1}) ${opt}`))
            console.log("\n(back) Main Menu |  (exit) Exit Menus")
        }

        function log(messageLines, title) {
            const top = `\n${shapeColor}` + "╭" + "─".repeat(50) + "╮" + "\x1b[0m"
            const bottom = `${shapeColor}╰` + "─".repeat(50) + "╯" + "\x1b[0m"
            const emptyLine = `${shapeColor}│` + " ".repeat(50) + "│" + "\x1b[0m"

            console.log(top)

            if (title) {
                const strip = title.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                const titleLine =
                    `${shapeColor}│` + " " + `${logColor}` +
                    strip.padEnd(48) + " " + `${shapeColor}│`
                console.log(titleLine)
                console.log(emptyLine)
            }

            messageLines.forEach((line, i) => {
                if (line.startsWith("\x1b")) {
                    const strip = line.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                    let formattedLine =
                        `${shapeColor}│${logColor}` + ` ${i + 1} ` +
                        `${strip.padEnd(51)}` + " " + `${shapeColor}│` + "\x1b[0m"
                    console.log(formattedLine)
                } else {
                    const strip = line.replace(/\\x1b\\ [0-9;]*[mGK]/g, '')
                    let formattedLine =
                        `${shapeColor}│${logColor}` + ` ${i + 1} ` +
                        `${strip.padEnd(46)}` + " " + `${shapeColor}│` + "\x1b[0m"
                    console.log(formattedLine)
                }
            })

            const standart =
                `${shapeColor}│` + " " + `${logColor}` +
                " (back)      (exit)".padEnd(48) + " " + `${shapeColor}│`

            console.log(emptyLine)
            console.log(standart)
            console.log(bottom + "\n")
        }

        function setRedPrompt(COLOR, PROMPT) {
            process.stdout.write(COLOR)
            rl.setPrompt(`${COLOR}${PROMPT}`)
            rl.prompt()
        }

        async function showSubMenu(titleOrFn, optionsOrFn, switcher, returnToMain = false) {
            return new Promise((resolve) => {
                function ask() {
                    const title = (typeof titleOrFn === 'function') ? titleOrFn() : titleOrFn
                    const options = (typeof optionsOrFn === 'function') ? optionsOrFn() : optionsOrFn

                    log(options, title)
                    setRedPrompt(rootColor, root)

                    rl.once("line", (input) => {
                        input = input.trim()

                        if (input === "back") {
                            resolve("back")
                        } else if (input === "exit") {
                            resolve("exit")
                        } else {
                            if (switcher[input]) {
                                switcher[input](input)
                            } else if (switcher.default) {
                                switcher.default(input)
                            }
                            ask()
                        }
                    })
                }

                ask()
            }).then((result) => {
                if (result === "exit") {
                    updateSettings('totallog', true)
                    callback()
                } else if (returnToMain) {
                    mainMenu()
                }
            })
        }

        function mainMenu() {
            const INFOS = [
                "SET CMD COLOR",
                "SET LOG COLOR",
                "SET OUTLINE COLOR",
                "HIDE NUMBER",
                "SET CMD TEXT"
            ]

            log(INFOS)

            rl.once("line", async (input) => {
                input = input.toLowerCase().trim()

                switch (input) {
                    case "1": {
                        await showSubMenu("Set cmd color", [
                            "\x1b[37mBlack",
                            "\x1b[31mRed",
                            "\x1b[32mGreen",
                            "\x1b[33mYellow",
                            "\x1b[34mBlue",
                            "\x1b[35mMagenta",
                            "\x1b[36mCyan",
                            "\x1b[37mWhite",
                        ], {
                            1: () => updateSettings('rootColor', "\x1b[30m"),
                            2: () => updateSettings('rootColor', "\x1b[31m"),
                            3: () => updateSettings('rootColor', "\x1b[32m"),
                            4: () => updateSettings('rootColor', "\x1b[33m"),
                            5: () => updateSettings('rootColor', "\x1b[34m"),
                            6: () => updateSettings('rootColor', "\x1b[35m"),
                            7: () => updateSettings('rootColor', "\x1b[36m"),
                            8: () => updateSettings('rootColor', "\x1b[37m"),
                            default: (x) => console.log(`invalid: ${x}`)
                        }, true)
                    }
                        break

                    case "2": {
                        await showSubMenu("Set log color", [
                            "\x1b[37mBlack",
                            "\x1b[31mRed",
                            "\x1b[32mGreen",
                            "\x1b[33mYellow",
                            "\x1b[34mBlue",
                            "\x1b[35mMagenta",
                            "\x1b[36mCyan",
                            "\x1b[37mWhite",
                        ], {
                            1: () => updateSettings('logColor', "\x1b[30m"),
                            2: () => updateSettings('logColor', "\x1b[31m"),
                            3: () => updateSettings('logColor', "\x1b[32m"),
                            4: () => updateSettings('logColor', "\x1b[33m"),
                            5: () => updateSettings('logColor', "\x1b[34m"),
                            6: () => updateSettings('logColor', "\x1b[35m"),
                            7: () => updateSettings('logColor', "\x1b[36m"),
                            8: () => updateSettings('logColor', "\x1b[37m"),
                            default: (x) => console.log(`invalid: ${x}`)
                        }, true)
                    }
                        break

                    case "3": {
                        await showSubMenu("Set log shape color", [
                            "\x1b[37mBlack",
                            "\x1b[31mRed",
                            "\x1b[32mGreen",
                            "\x1b[33mYellow",
                            "\x1b[34mBlue",
                            "\x1b[35mMagenta",
                            "\x1b[36mCyan",
                            "\x1b[37mWhite",
                        ], {
                            1: () => updateSettings('shapeColor', "\x1b[30m"),
                            2: () => updateSettings('shapeColor', "\x1b[31m"),
                            3: () => updateSettings('shapeColor', "\x1b[32m"),
                            4: () => updateSettings('shapeColor', "\x1b[33m"),
                            5: () => updateSettings('shapeColor', "\x1b[34m"),
                            6: () => updateSettings('shapeColor', "\x1b[35m"),
                            7: () => updateSettings('shapeColor', "\x1b[36m"),
                            8: () => updateSettings('shapeColor', "\x1b[37m"),
                            default: (x) => console.log(`invalid: ${x}`)
                        }, true)
                    }
                        break

                    case "4": {
                        await showSubMenu(
                            () => {
                                return "Hide number"
                            },
                            () => {
                                const hideNumbex = global.hideNumber
                                let xon = hideNumbex ? "Turn off" : "Turn on"
                                return [xon]
                            },
                            {
                                1: () => {
                                    const newValue = !global.hideNumber
                                    updateSettings("hideNumber", newValue)
                                },
                                default: (x) => console.log(`invalid: ${x}`)
                            },
                            true
                        )
                    }
                        break

                    case "5": {
                        await showSubMenu(
                            () => {
                                return `Current cmd: ${global.root} Enter new cmd`
                            },
                            [],
                            {
                                default: (x) => {
                                    updateSettings("root", `${x} `)
                                }
                            },
                            true
                        )
                    }
                        break

                    case "exit":
                        updateSettings('totallog', true)
                        callback()
                        break

                    default:
                        mainMenu()
                        break
                }
            })

            setRedPrompt(rootColor, root)
        }

        mainMenu()
    } catch (err) {
        console.log(err)
        callback()
    }
}
