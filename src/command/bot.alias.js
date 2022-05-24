export default async function ({ Core, alias, flag: GroupFlag, botPermLevel, group, command, text, quote }) {
    if (command !== "bot.alias") return
    if (botPermLevel < 1) {
        await quote("该指令需要管理员权限")
        return
    }
    const params = text.split(/\s+/)
    const help = `${alias} list`
        + `\n${alias} <flag> <add|remove> <alias>`
    if (!params[1] || !["help", "list"].includes(params[1].toLowerCase()) && (!params[2] || !params[3])) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} bot.help add /?`
            + `\n${alias} bot.alias remove /alias`
        await quote(fullHelp)
        return
    }
    if (params[1].toLowerCase() === "list") {
        await quote(GroupFlag.filter(flag => Core.Flag[flag] && Core.Flag[flag].type === "Command" && Core.Flag[flag].alias).map(flag => {
            if (Core.Alias[group] && Core.Alias[group][flag]) return `${flag} ${Core.Alias[group][flag].join(" ") || Core.Flag[flag].alias.join(" ")}`
            return `${flag} ${Core.Flag[flag].alias.join(" ")}`
        }).join("\n"))
        return
    }
    const flag = params[1]
    alias = params[3].toLowerCase()
    if (!Object.keys(Core.Flag).includes(flag)) {
        await quote("该flag不存在")
        return
    }
    if (Core.Flag[flag].type !== "Command") {
        await quote("该flag不是指令")
        return
    }
    if (!GroupFlag.includes(flag)) {
        await quote("该flag未开启")
        return
    }
    switch (params[2].toLowerCase()) {
        case "add": {
            if (!Core.Alias[group]) Core.Alias[group] = {}
            if (Core.Alias[group][flag] ? Core.Alias[group][flag].includes(alias) : Core.Flag[flag].alias.includes(alias)) {
                await quote("该别名已存在")
                return
            }
            if (Object.keys(Core.Alias[group]).find(flag => Core.Alias[group][flag].includes(alias)) || Object.keys(Core.Flag).find(flag => Core.Flag[flag].type === "Command" && Core.Flag[flag].alias.includes(alias))) {
                await quote("别名不能与其他指令重复")
                return
            }
            Core.Alias[group][flag] = Core.Alias[group][flag] ? Core.Alias[group][flag].concat(alias) : Core.Flag[flag].alias.concat(alias)
            if (JSON.stringify(Core.Alias[group][flag]) === JSON.stringify(Core.Flag[flag].alias)) delete Core.Alias[group][flag]
            Core.Alias = Core.Alias
            await quote(`已为${flag}添加${alias}`)
            return
        }
        case "remove": {
            if (!Core.Alias[group]) Core.Alias[group] = {}
            if (Core.Alias[group][flag] ? !Core.Alias[group][flag].includes(alias) : !Core.Flag[flag].alias.includes(alias)) {
                await quote("该别名不存在")
                return
            }
            const aliasList = Core.Alias[group][flag] ? Core.Alias[group][flag].slice() : Core.Flag[flag].alias.slice()
            aliasList.splice(aliasList.indexOf(alias), 1)
            if (JSON.stringify(aliasList) === JSON.stringify(Core.Flag[flag].alias) || !aliasList.length) {
                delete Core.Alias[group][flag]
            } else {
                Core.Alias[group][flag] = aliasList
            }
            Core.Alias = Core.Alias
            await quote(`已为${flag}删除${alias}`)
            return
        }
        default:
            await quote(help)
            return
    }
}