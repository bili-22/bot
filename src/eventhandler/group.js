
import * as path from 'path';
import * as fs from "fs";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const setting = JSON.parse(fs.readFileSync(path.join(__dirname, "../../config/Setting.json")))

export default async function ({ Core, data, bot }) {
    switch (data.type) {
        case 'BotInvitedJoinGroupRequestEvent': {
            if (!Core.inviteList.find(item => item.groupId === data.groupId && bot.config.qq === item.bot.config.qq)) Core.inviteList.push(data)
            if (setting.notice) {
                await Core.sendNotice(
                    `收到了新的加群邀请\n被邀请账号:${bot.nickname}(${bot.config.qq})\n邀请者:${data.nick}(${data.fromId})\n群:${data.groupName}(${data.groupId})`
                )
            }
            return
        }
        case 'BotJoinGroupEvent': {
            if (!Core.groupBotMap[data.group.id]) Core.groupBotMap[data.group.id] = []
            if (!Core.groupBotMap[data.group.id].includes(bot.config.qq)) Core.groupBotMap[data.group.id].push(bot.config.qq)
            return
        }
        case 'BotLeaveEventActive':
        case 'BotLeaveEventKick': {
            if (Core.groupBotMap[data.group.id].includes(bot.config.qq)) Core.groupBotMap[data.group.id].splice(Core.groupBotMap[data.group.id].indexOf(bot.config.qq), 1)
            return
        }
    }
}