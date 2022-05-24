import { Bot, Message, Middleware } from 'mirai-js';
import * as fss from "fs";
const fs = fss.promises
import * as path from 'path';
import { fileURLToPath } from 'url';
import log4js from 'log4js';
import { db } from "./src/lib/db.js";
import { group } from 'console';

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
        "default": { "appenders": ["console", "all", "error"], "level": "info" }
    }
});

const logger = log4js.getLogger('default');

const commandModules = [];
const eventHandlers = [];

if (!fss.existsSync(path.join(__dirname, "data"))) {
    fss.mkdirSync(path.join(__dirname, "data"))
    fss.mkdirSync(path.join(__dirname, "data/Image"))
    fss.writeFileSync(path.join(__dirname, "data/Alias.json"), "{}")
    fss.writeFileSync(path.join(__dirname, "data/Flag.json"), "{}")
    fss.writeFileSync(path.join(__dirname, "data/Perm.json"), "{}")
}

const Core = { store: {} };
[["Perm", "data/Perm.json"], ["SuperUser", "config/SuperUser.json"], ["GroupFlag", "data/Flag.json"], ["Alias", "data/Alias.json"], ["Flag", "config/Flag.json"], ["Template", "config/Template.json"]].forEach(config => {
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
        //施工
        return null
    } else {
        return null
    }
};

(async () => {
    const cmddir = await fs.readdir(path.join(__dirname, "src/command"))
    cmddir.forEach(filename => {
        import("./" + path.join("./src/command", filename))
            .then(module => module.default && commandModules.push(module.default))
    })
    const eventdir = await fs.readdir(path.join(__dirname, "src/eventhandler"))
    eventdir.forEach(filename => {
        import("./" + path.join("./src/eventhandler", filename))
            .then(module => module.default && eventHandlers.push(module.default))
    })

    const configs = JSON.parse(await fs.readFile(path.join(__dirname, "config/Bot.json")))
    const bots = configs.map(() => new Bot())
    Core.getGroupInfo = async ({ groupId, groupName }) => {
        if (groupId && !+groupId) return null
        const groupList = [].concat(...await Promise.all(bots.map(bot => bot.getGroupList().then(result => result.data.map(group => Object.assign({ bot: bot }, group))))))
        return groupList.find(group => group.id === +groupId || group.name === groupName)
    }
    await Promise.all(bots.map((bot, i) => bot.open(configs[i])))
    Core.accounts = bots.map(bot => bot.config.qq)
    bots.forEach(bot => {
        bot.sendGroupMessage = async (group, message) => {
            if (typeof message === "string") {
                await bot.sendMessage({
                    group: group,
                    message: new Message().addText(message),
                });
            }
            if (Buffer.isBuffer(message)) {
                const { imageId } = await bot.uploadImage({ img: message });
                await bot.sendMessage({
                    group: group,
                    message: new Message().addImageId(imageId),
                });
            }
        }
        bot.sendFriendMessage = async (qq, message) => {
            if (typeof message === "string") {
                await bot.sendMessage({
                    friend: qq,
                    message: new Message().addText(message),
                });
            }
            if (Buffer.isBuffer(message)) {
                const { imageId } = await bot.uploadImage({ img: message });
                await bot.sendMessage({
                    friend: qq,
                    message: new Message().addImageId(imageId),
                });
            }
        }
    });

    bots.forEach(bot => {
        bot.on('FriendMessage', handleMessage)
    });
    bots.forEach(bot => {
        bot.on('GroupMessage', handleMessage)
    });
    bots.forEach(bot => {
        bot.on('TempMessage', handleMessage)
    });
    const events = ['TempMessage', 'GroupMessage', 'FriendMessage', 'BotOnlineEvent', 'BotOfflineEventActive', 'BotOfflineEventForce', 'BotOfflineEventDropped', 'BotReloginEvent', 'BotGroupPermissionChangeEvent', 'BotMuteEvent', 'BotUnmuteEvent', 'BotJoinGroupEvent', 'BotLeaveEventActive', 'BotLeaveEventKick', 'GroupRecallEvent', 'FriendRecallEvent', 'GroupNameChangeEvent', 'GroupEntranceAnnouncementChangeEvent', 'GroupMuteAllEvent', 'GroupAllowAnonymousChatEvent', 'GroupAllowConfessTalkEvent', 'GroupAllowMemberInviteEvent', 'MemberJoinEvent', 'MemberLeaveEventKick', 'MemberLeaveEventQuit', 'MemberCardChangeEvent', 'MemberSpecialTitleChangeEvent', 'MemberPermissionChangeEvent', 'MemberMuteEvent', 'MemberUnmuteEvent', 'NewFriendRequestEvent', 'MemberJoinRequestEvent', 'BotInvitedJoinGroupRequestEvent']
    events.forEach(event => {
        bots.forEach(bot => {
            bot.on(event, handleEvent)
        })
    })
})();

const sourceIds = []

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
    if (Core.accounts.includes(data.sender.id)) return
    if (sourceIds.includes(data.messageChain[0].id)) return
    sourceIds.unshift(data.messageChain[0].id)
    if (sourceIds.length > 1000) sourceIds.length = 500

    const bot = data.bot
    const sender = data.sender.id
    const group = data.sender.group && data.sender.group.id
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
        try {
            if (typeof message === "string") {
                await bot.sendMessage({
                    temp: data.type === 'TempMessage',
                    friend: (data.type === 'TempMessage' || data.type === 'FriendMessage') && sender,
                    group: (data.type === 'TempMessage' || data.type === 'GroupMessage') && group,
                    quote: isQuote && data.messageChain[0].id,
                    message: new Message().addText(message),
                });
            }
            if (Buffer.isBuffer(message)) {
                const { imageId } = await bot.uploadImage({ img: message });
                await bot.sendMessage({
                    temp: data.type === 'TempMessage',
                    friend: (data.type === 'TempMessage' || data.type === 'FriendMessage') && sender,
                    group: (data.type === 'TempMessage' || data.type === 'GroupMessage') && group,
                    quote: isQuote && data.messageChain[0].id,
                    message: new Message().addImageId(imageId),
                });
            }
        } catch (error) {
            if (error.name === "Error" && error.message === "Bot被禁言") {
                logger.warn(group, "Bot被禁言", typeof message === "string" && message || Buffer.isBuffer(message) && "Buffer" || "Other")
                return
            }
        }
    }
    const command = await checkCommand(text, group)
    Promise.all(commandModules.map(handleCommand => handleCommand({
        Core: Core,
        flag: group && (Core.GroupFlag[group] || []),
        db: db,
        logger: logger,
        type: data.type,
        data: data,
        bot: bot,
        command: command,
        alias: command && (group && Core.Alias[group] && Core.Alias[group][command] ? Core.Alias[group][command][0] : Core.Flag[command].alias[0]),
        sender: sender,
        group: group,
        groupName: groupName,
        messageChain: data.messageChain,
        text: text,
        groupPermLevel: group && (data.sender.permission === "OWNER" && 2 || data.sender.permission === "ADMIN" && 1 || 0),
        botPermLevel: Core.SuperUser.includes(sender) && 4 || group && (Core.Perm[group] && Core.Perm[group][sender] || 0),
        selfPermLevel: selfPermLevel,
        __dirname: __dirname,
        quote: async message => sendMessage(message, true),
        sendMessage: async message => sendMessage(message)
    }))).catch(error => {
        sendMessage("未知错误", true)
        logger.error(data.type, sender + (group || ""), text, error)
    })
}

async function checkCommand(text, group) {
    text = String(text.split(/\s+/)[0]).toLowerCase()
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