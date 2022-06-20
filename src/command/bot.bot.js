let tempInviteList
import { Bot } from "mirai-js"
import * as os from 'os'

export default async function ({ Core, bot, alias, group, command, text, quote, botPermLevel, botInfo }) {
    if (command !== "bot.bot") return
    const help = `${alias}`
        + `\n${alias} <qq>`
        + `\n${alias} list`
        + `\n${alias} invitelist`
        + `\n${alias} agree <邀请编号>`
        + `\n${alias} refuse <邀请编号>`
    const params = text.toLowerCase().replace(/\[\[@(.*?)\]\]/g, " $1 ").split(/\s+/)
    if (!params[1]) {
        const time = performance.now()
        await quote(
            `内存占用:${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB(${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(1)}/${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB)`
            + `\n接收消息数:${botInfo.sourceIds.size}(${botInfo.msgCount})`
            + `\n发送消息数:${botInfo.sendSourceIds.size}`
            + `\n运行时间:${time / 3600000 > 1 ? Math.floor(time / 3600000) + "时" : ""}${time / 60000 > 1 ? Math.floor(time % 3600000 / 60000) + "分" : ""}${Math.floor(time % 60000 / 1000)}秒`
        )
        return
    }
    if (botPermLevel < 4) {
        await quote(`需要超级管理员权限`)
        return
    }
    if (params[1] in Core.bots) {
        bot = Core.bots[params[1]] || Core.bots[group && Core.Config[group] && Core.Config[group].bot] || bot
        const { data: groupList } = await bot.getGroupList();
        await quote(
            `${bot.nickname}`
            + `\n${groupList.map(group => `${group.name}(${group.id})${group.id in Core.GroupFlag && Core.GroupFlag[group.id].length ? `[开启]` : `[未配置]`}`).join("\n")}`
        )
        return
    }
    switch (params[1]) {
        // case "use": {
        //     if (!params[2] || !group) {
        //         await quote(help)
        //         return
        //     }
        //     if (!(params[2] in Core.bots)) {
        //         await quote(`账号不存在`)
        //         return
        //     }
        //     if (!Core.Config[group]) Core.Config[group] = {}
        //     Core.Config[group].bot = +params[2]
        //     Core.Config = Core.Config
        //     await quote(`已切换`)
        //     return
        // }
        case "1": {
            await Promise.allSettled(Object.keys(Core.accounts).map(qq => Core.sendGroupMessage(group, "1", Core.accounts[qq])))
            return
        }
        case "list": {
            const loginList = await Promise.all(Object.keys(Core.accounts).map(qq => Bot.isBotLoggedIn(Core.accounts[qq].config)))
            const groupList = await Promise.all(Object.keys(Core.bots).map(qq => Core.bots[qq].getGroupList().then(result => ({ qq, data: result.data })))).then(result => Object.fromEntries(result.map(item => [item.qq, item.data])))
            await quote(`bot列表:\n` + Object.keys(Core.accounts).map((qq, i) => {
                return `${Core.accounts[qq].nickname}${groupList[qq] ? `[${groupList[qq].filter(group => group.id in Core.GroupFlag && Core.GroupFlag[group.id].length).length}/${groupList[qq].length}]` : ""}(${qq})${loginList[i] ? "" : "[离线]"}`
            }).join("\n"))
            return
        }
        case "invitelist": {
            if (!Core.inviteList.length) {
                await quote(`当前没有邀请`)
                return
            }
            tempInviteList = Core.inviteList.slice()
            await quote(tempInviteList.map((inviteData, index) => `${index + 1}. ${inviteData.groupName}(${inviteData.groupId})\n账号:${inviteData.bot.nickname}(${inviteData.bot.config.qq})`).join("\n"))
            return
        }
        case "refuse":
        case "agree": {
            const isAgree = params[1] === "agree"
            if (!+params[2]) {
                await quote(help)
                return
            }
            if (!tempInviteList || !tempInviteList[+params[2] - 1]) {
                await quote("邀请不存在")
                return
            }
            if (!Core.inviteList.includes(tempInviteList[+params[2] - 1])) {
                await quote(`邀请已被同意或拒绝`)
                return
            }
            if (isAgree) tempInviteList[+params[2] - 1].agree()
            Core.inviteList.splice(Core.inviteList.indexOf(tempInviteList[+params[2] - 1]), 1)
            await quote(isAgree ? "已同意" : "已拒绝")
            return
        }
        case "help":
        default: {
            await quote(help)
            return
        }
    }
}