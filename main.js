import { Bot, Message, Middleware } from 'mirai-js';
import * as fss from "fs";
const fs = fss.promises
import * as path from 'path';
import { fileURLToPath } from 'url';
import log4js from 'log4js';
import * as db from "./src/lib/db.js";
import { Flag } from './src/flag.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

log4js.configure({
    "appenders": {
        "console": { "type": "stdout" },
        "allFile": { "type": "file", "filename": path.join(__dirname, "all.log") },
        "all": { "type": "logLevelFilter", "appender": "allFile", "level": "all" },
        "errorFile": { "type": "file", "filename": path.join(__dirname, "error.log") },
        "error": { "type": "logLevelFilter", "appender": "errorFile", "level": "error" },
    },
    "categories": {
        "default": { "appenders": ["console", "all", "error"], "level": "info" },
        "gateway": { "appenders": ["console", "all", "error"], "level": "info" }
    }
});

const sourceIds = new Set()
const sendSourceIds = new Set()
let msgCount = 0

export const getLogger = log4js.getLogger
const logger = getLogger('default');

const commandModules = [];
const eventHandlers = [];

if (!fss.existsSync(path.join(__dirname, "data"))) {
    fss.mkdirSync(path.join(__dirname, "data"))
    fss.mkdirSync(path.join(__dirname, "data/Image"))
    fss.writeFileSync(path.join(__dirname, "data/Alias.json"), "{}")
    fss.writeFileSync(path.join(__dirname, "data/Flag.json"), "{}")
    fss.writeFileSync(path.join(__dirname, "data/Perm.json"), "{}")
    fss.writeFileSync(path.join(__dirname, "data/Config.json"), "{}")
}
if (!fss.existsSync(path.join(__dirname, "config"))) {
    fss.mkdirSync(path.join(__dirname, "config"))
    fss.writeFileSync(path.join(__dirname, "config/Bot.json"), JSON.stringify({ "baseUrl": "http://127.0.0.1:8080", "verifyKey": "123456", "qqList": [123456] }, "", "\t"))
    fss.writeFileSync(path.join(__dirname, "config/Setting.json"), JSON.stringify({ "gateway": { "defaultAccount": 1006686517277, "baseUrl": "https://sparta-gw.battlelog.com/jsonrpc/pc/api" }, "database": { "host": "127.0.0.1", "user": "root", "password": "12345678", "database": "bf1", "port": 1234 }, "notice": { "group": 12345 } }, "", "\t"))
    fss.writeFileSync(path.join(__dirname, "config/SuperUser.json"), "[]")
    fss.writeFileSync(path.join(__dirname, "config/Template.json"), JSON.stringify({ "default": ["bot.help", "bot.debug", "bot.perm", "bot.flag", "bot.alias", "bot.pic", "bot.bot"] }, "", "\t"))
}
const setting = JSON.parse(fss.readFileSync(path.join(__dirname, "./config/Setting.json")))




export const Core = { store: {}, inviteList: [], accounts: {}, bots: {}, groupBotMap: {}, Flag };
[["Perm", "data/Perm.json"], ["SuperUser", "config/SuperUser.json"], ["Config", "data/Config.json"], ["GroupFlag", "data/Flag.json"], ["Alias", "data/Alias.json"], ["Template", "config/Template.json"]].forEach(config => {
    Object.defineProperty(Core, config[0], {
        get() {
            if (!this.store[config[0]]) this.store[config[0]] = JSON.parse(fss.readFileSync(path.join(__dirname, config[1])))
            return this.store[config[0]]
        },
        set(value) {
            this.store[config[0]] = value
            fss.writeFileSync(path.join(__dirname, config[1]), JSON.stringify(this.store[config[0]]))
        }
    });
});
Core.checkPerm = function ({ group, server, qq }) {
    if (group) {
        return Core.SuperUser.includes(qq) && 4 || Core.Perm[group] && Core.Perm[group][qq] || 0
    } else if (server) {
        //??????
        return null
    } else {
        return null
    }
};

void async function () {
    const cmddir = await fs.readdir(path.join(__dirname, "src/command"))
    cmddir.forEach(filename => {
        import("./" + path.join("./src/command", filename))
            .then(module => module.default && commandModules.push(module.default))
    })
    const cmddirC = await fs.readdir(path.join(__dirname, "src/commandC"))
    cmddirC.forEach(filename => {
        import("./" + path.join("./src/commandC", filename))
            .then(module => module.default && commandModules.push(module.default))
    })
    const eventdir = await fs.readdir(path.join(__dirname, "src/eventhandler"))
    eventdir.forEach(filename => {
        import("./" + path.join("./src/eventhandler", filename))
            .then(module => module.default && eventHandlers.push(module.default))
    })
    const { baseUrl, qqList, verifyKey } = JSON.parse(await fs.readFile(path.join(__dirname, "config/Bot.json")))

    qqList.forEach(qq => Core.accounts[qq] = new Bot())
    qqList.forEach(qq => initBot(Core.accounts[qq], { baseUrl, qq, verifyKey }))
}()
async function initBot(bot, config) {
    const isLoggedIn = await Bot.isBotLoggedIn(config)
    if (!isLoggedIn) {
        console.log(config.qq + "?????????")
        return
    }
    await bot.open(config)
    const { data: groupList } = await bot.getGroupList()
    groupList.forEach(group => Core.groupBotMap[group.id] ? Core.groupBotMap[group.id].push(bot.config.qq) : Core.groupBotMap[group.id] = [bot.config.qq])
    const { nickname } = await bot.getUserProfile({ qq: bot.config.qq })
    bot.nickname = nickname
    bot.on('FriendMessage', handleMessage)
    bot.on('GroupMessage', handleMessage)
    bot.on('TempMessage', handleMessage)
    bot.on('NewFriendRequestEvent', new Middleware().friendRequestProcessor().done(handleEvent))
    bot.on('MemberJoinRequestEvent', new Middleware().memberJoinRequestProcessor().done(handleEvent))
    bot.on('BotInvitedJoinGroupRequestEvent', new Middleware().invitedJoinGroupRequestProcessor().done(handleEvent))
    bot.on('BotOnlineEvent', () => Core.bots[bot.config.qq] = bot)
    bot.on('BotOfflineEventActive', () => delete Core.bots[bot.config.qq])
    bot.on('BotOfflineEventForce', () => delete Core.bots[bot.config.qq])
    bot.on('BotOfflineEventDropped', () => delete Core.bots[bot.config.qq])
    const events = ['BotReloginEvent', 'BotGroupPermissionChangeEvent', 'BotMuteEvent', 'BotUnmuteEvent', 'BotJoinGroupEvent', 'BotLeaveEventActive', 'BotLeaveEventKick', 'GroupRecallEvent', 'FriendRecallEvent', 'GroupNameChangeEvent', 'GroupEntranceAnnouncementChangeEvent', 'GroupMuteAllEvent', 'GroupAllowAnonymousChatEvent', 'GroupAllowConfessTalkEvent', 'GroupAllowMemberInviteEvent', 'MemberLeaveEventKick', 'MemberLeaveEventQuit', 'MemberCardChangeEvent', 'MemberSpecialTitleChangeEvent', 'MemberPermissionChangeEvent', 'MemberMuteEvent', 'MemberUnmuteEvent', 'MemberJoinEvent']
    events.forEach(event => {
        bot.on(event, handleEvent)
    })
    Core.bots[bot.config.qq] = bot
}

Core.sendGroupMessage = async (group, message, bot) => {
    if (!bot) {
        const availableBots = group && Core.groupBotMap[group] ? Core.groupBotMap[group].filter(qq => Core.bots[qq]) : []
        if (!availableBots.length) {
            return
        }
        bot = Core.bots[availableBots[Math.floor((Math.random() * availableBots.length))]]
    }
    try {
        let messageId
        if (typeof message === "string") {
            const msg = new Message()
            const texts = message.split(/\[\[@[0-9]+\]\]/g)
            const ats = (message.match(/\[\[@[0-9]+\]\]/g) || []).map(t => +t.replace(/\[\[@([0-9]+)\]\]/, '$1'))
            texts.forEach((text, index) => {
                msg.addText(text)
                if (ats[index]) msg.addAt(ats[index])
            })
            messageId = await bot.sendMessage({
                group: group,
                message: msg,
            });
        }
        if (Buffer.isBuffer(message)) {
            const { imageId } = await bot.uploadImage({ img: message });
            messageId = await bot.sendMessage({
                group: group,
                message: new Message().addImageId(imageId),
            });
        }
        logger.info(`${bot.config.qq} SendGroupMessage ${group}\n${typeof message === "string" && message || Buffer.isBuffer(message) && "Buffer" || "Other"}`)
        sendSourceIds.add(messageId)
        return messageId
    } catch (error) {
        if (error.name === "Error" && error.message === "Bot?????????") {
            logger.warn(`${bot.config.qq} SendGroupMessage(?????????) ${bot.config.qq} ${group}\n${typeof message === "string" && message || Buffer.isBuffer(message) && "Buffer" || "Other"}`)
            return
        }
        throw error
    }
}
Core.sendNotice = async function (message) {
    return await Core.sendGroupMessage(setting.notice.group, message)
}

async function handleEvent(data) {
    Promise.all(eventHandlers.map(handlerEvent => handlerEvent({
        Core: Core,
        db: db,
        logger: logger,
        type: data.type,
        data: data,
        bot: data.bot,
        __dirname: __dirname
    }))).catch(error => {
        logger.error(data.type, error)
    })
}

async function handleMessage(data) {
    msgCount++
    const sender = data.sender.id
    const group = data.sender.group && data.sender.group.id || null
    const bot = data.bot
    if (group && !Core.groupBotMap[group]) {
        Core.groupBotMap[group] = [bot.config.qq]
    } else if (group && !Core.groupBotMap[group].includes(bot.config.qq)) {
        Core.groupBotMap[group].push(bot.config.qq)
    }
    if (sender in Core.bots) return
    // if (group && Core.Config[group] && Core.Config[group].bot && Core.bots[Core.Config[group].bot] && bot !== Core.bots[Core.Config[group].bot]) return
    if (sourceIds.has(data.messageChain[0].id)) return
    sourceIds.add(data.messageChain[0].id)
    const groupName = data.sender.group && data.sender.group.name
    const selfPermLevel = data.sender.group && (data.sender.group.permission === "OWNER" && 2 || data.sender.group.permission === "ADMIN" && 1 || 0)
    const text = data.messageChain.map(message => {
        switch (message.type) {
            case "Plain":
                return message.text
            case "At":
                return "[[@" + message.target + "]]"
            default:
                return ""
        }
    }).join("")
    logger.trace(data.type, sender + (group || ""), JSON.stringify(data.messageChain))
    const sendMessage = async (message, isQuote) => {

        // const availableBots = group ? Core.groupBotMap[group].filter(qq => Core.bots[qq]) : []
        // const bot = availableBots.includes(3492557425) && Core.bots[3492557425] || group ? Core.bots[availableBots[Math.floor((Math.random() * availableBots.length))]] : data.bot
        try {
            let messageId
            if (typeof message === "string") {
                const msg = new Message()
                const texts = message.split(/\[\[@[0-9]+\]\]/g)
                const ats = (message.match(/\[\[@[0-9]+\]\]/g) || []).map(t => +t.replace(/\[\[@([0-9]+)\]\]/, '$1'))
                texts.forEach((text, index) => {
                    msg.addText(text)
                    if (ats[index]) msg.addAt(ats[index])
                })
                messageId = await bot.sendMessage({
                    temp: data.type === 'TempMessage',
                    friend: (data.type === 'TempMessage' || data.type === 'FriendMessage') && sender,
                    group: (data.type === 'TempMessage' || data.type === 'GroupMessage') && group,
                    quote: isQuote && data.messageChain[0].id,
                    message: msg,
                });
            }
            if (Buffer.isBuffer(message)) {
                const { imageId } = await bot.uploadImage({ img: message });
                messageId = await bot.sendMessage({
                    temp: data.type === 'TempMessage',
                    friend: (data.type === 'TempMessage' || data.type === 'FriendMessage') && sender,
                    group: (data.type === 'TempMessage' || data.type === 'GroupMessage') && group,
                    quote: isQuote && data.messageChain[0].id,
                    message: new Message().addImageId(imageId),
                });
            }
            logger.info(`${bot.config.qq} ${data.type} ${group ? `${group} ${sender}\n${data.sender.group.name} ` : `${sender}\n`}${data.sender.memberName || data.sender.nickname || sender}:${text}\n${typeof message === "string" && message || Buffer.isBuffer(message) && "Buffer" || "Other"}`)
            sendSourceIds.add(messageId)
            return messageId
        } catch (error) {
            if (error.name === "Error" && error.message === "Bot?????????") {
                logger.warn(`${bot.config.qq} ${data.type}(?????????) ${group ? `${group} ${sender}\n${data.sender.group.name} ` : `${sender}\n`}${data.sender.memberName || data.sender.nickname || sender}:${text}\n${typeof message === "string" && message || Buffer.isBuffer(message) && "Buffer" || "Other"}`)
                return
            }
            logger.error(`${bot.config.qq} ${data.type}(??????) ${group ? `${group} ${sender}\n${data.sender.group.name} ` : `${sender}\n`}${data.sender.memberName || data.sender.nickname || sender}:${text}\n${typeof message === "string" && message || Buffer.isBuffer(message) && "Buffer" || "Other"}\n`, error)
        }
    }
    const command = await checkCommand(text, group)
    const aliases = {}
    Object.keys(Core.Flag).filter(flag => Core.Flag[flag].type === "Command").forEach(flag => aliases[flag] = group && Core.Alias[group] && Core.Alias[group][flag] ? Core.Alias[group][flag] : Core.Flag[flag].alias)
    Promise.all(commandModules.map(handleCommand => handleCommand({
        Core: Core,
        flag: group && (Core.GroupFlag[group] || []),
        db: db,
        logger: logger,
        type: data.type,
        data: data,
        bot: bot,
        quoteId: data.messageChain[1] && data.messageChain[1].type === 'Quote' && data.messageChain[1].id || null,
        command: command,
        alias: command && (group && Core.Alias[group] && Core.Alias[group][command] ? Core.Alias[group][command][0] : Core.Flag[command].alias[0]),
        aliases,
        sender: sender,
        group: group,
        groupName: groupName,
        messageChain: data.messageChain,
        botInfo: { msgCount, sourceIds, sendSourceIds },
        text: text,
        recall: async messageId => await bot.recall({ messageId }),
        groupPermLevel: group && (data.sender.permission === "OWNER" && 2 || data.sender.permission === "ADMIN" && 1 || 0),
        botPermLevel: Core.SuperUser.includes(sender) && 4 || group && (Core.Perm[group] && Core.Perm[group][sender] || 0),
        selfPermLevel: selfPermLevel,
        __dirname: __dirname,
        quote: async message => sendMessage(message, true),
        sendMessage: async message => sendMessage(message)
    }))).catch(error => {
        sendMessage("????????????", true)
        logger.error(data.type, sender + (group || ""), text, error)
    })
}

async function checkCommand(text, group) {
    text = String(text.split(/\s+/)[0]).replace(/^???/, "/").toLowerCase()
    return Object.keys(Core.Flag).filter(flag => Core.Flag[flag].type === "Command").find(flag => {
        if (group && !Core.Flag[flag].group) return
        if (!group && !Core.Flag[flag].friend) return
        if (group && (!Core.GroupFlag[group] || !Core.GroupFlag[group] || !Core.GroupFlag[group].includes(flag))) return
        if (group && Core.Alias[group] && Core.Alias[group][flag]) {
            return Core.Alias[group][flag].includes(text) || null
        } else {
            return Core.Flag[flag].alias.includes(text) || null
        }
    }) || null
}