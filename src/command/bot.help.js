export default async function ({ Core, alias, flag, group, command, text, quote, botPermLevel }) {
    if (command !== "bot.help") return
    const category = text.split(/\s+/)[1] || null
    const flagList = {}
    Object.keys(Core.Flag).forEach(flag => {
        const category = flag.split(".")[0]
        if (!flagList[category]) {
            flagList[category] = [flag]
        } else {
            flagList[category].push(flag)
        }
    })
    if (!category) {
        const descriptions = {
            "bot": "机器人核心功能",
            "admin": "群管功能",
            "bf1info": "战地1信息查询",
            "bf1account": "战地1账号功能",
            "bf1rsp": "战地1服务器管理",
        }
        await quote(Object.keys(flagList)
            .filter(category => flagList[category].filter(item => !flag || flag.includes(item)).length)
            .map(category => `${category}:${descriptions[category] || "无"}`).join("\n")
            + `\n请使用[${alias} 功能名]以查看详细帮助`
        )
    } else {
        await quote(flagList[category]
            .filter(item => !flag || flag.includes(item))
            .map(flag => `${group && Core.Alias[group] && Core.Alias[group][flag] ? Core.Alias[group][flag][0] : Core.Flag[flag].alias[0]} ${Core.Flag[flag].description || "无帮助信息"}`)
            .join("\n")
        )
    }
    return
}