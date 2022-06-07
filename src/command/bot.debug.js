export default async function ({ Core, text, bot, alias, group, groupName, command, quote, botPermLevel }) {
    if (command !== "bot.debug") return
    if (botPermLevel < 4) {
        await quote("该指令需要超级管理员权限")
        return
    }
    const params = text.split(/\s+/)
    const help = `${alias} say <group> <message>`
        + `\n${alias} init ${group ? "[group]" : "<group>"} <config>`
    switch (params[1]) {
        case "help": {
            await quote(help)
            return
        }
        case "say": {
            if (!params[2] || !params[3]) {
                await quote(help)
                return
            }
            try {
                await Core.sendGroupMessage(params[2], text.replace(/^.*?\s+.*?\s+.*?\s+/, ""))
            } catch (error) {
                if (error.name === "Error" && error.message === "指定对象不存在") {
                    await quote("群不存在")
                    return
                }
                if (error.name === "Error" && error.message === "Bot被禁言") {
                    await quote("Bot被禁言")
                    return
                }
                throw error
            }
            await quote("完成")
            return
        }
        case "init": {
            if (!params[2] || !group && !params[3]) {
                await quote(help)
                return
            }
            const template = params[3] || params[2]
            if (!Core.Template[template]) {
                await quote(`模板${template}不存在`)
                return
            }
            let targetGroup
            if (params[3]) {
                if (!+params[2]) {
                    await quote("群号不合法")
                    return
                }
                const groupList = await bot.getGroupList().then(result => result.data)
                let group = groupList.find(group => group.id === +params[2])
                if (group) {
                    targetGroup = group.id
                    groupName = group.name
                } else {
                    const groupList = [].concat(...await Promise.all(Object.keys(Core.bots).map(qq => Core.bots[qq]).map(bot => bot.getGroupList().then(result => result.data))))
                    let group = groupList.find(group => group.id === +params[2])
                    if (group) {
                        targetGroup = group.id
                        groupName = group.name
                    } else {
                        await quote("机器人不在群内")
                        return
                    }
                }
            } else {
                targetGroup = group
            }
            Core.GroupFlag[targetGroup] = Core.Template[template]
            Core.GroupFlag = Core.GroupFlag
            await quote(`已应用模板[${template}]到[${groupName}]`)
            return
        }
        default:
            await quote(help)
            return
    }
}