export default async function ({ Core, alias, flag, group, command, text, quote, botPermLevel }) {
    if (command !== "bot.flag") return
    if (botPermLevel < 4) {
        await quote("该指令需要超级管理员权限")
        return
    }
    const params = text.split(/\s+/)
    const help = `${alias} list [category]`
        + `\n${alias} <enable|disable> <category>`
        + `\n${alias} <enable|disable> <flag>`
    if (params[1] && params[1] === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} list`
            + `\n${alias} list bot`
            + `\n${alias} enable bot`
            + `\n${alias} disable bot.help`
        await quote(fullHelp)
        return
    }
    if (!params[1] || !["list", "enable", "disable"].includes(params[1].toLowerCase()) || ["enable", "disable"].includes(params[1].toLowerCase()) && !params[2]) {
        await quote(help)
        return
    }
    const flagList = {}
    Object.keys(Core.Flag).forEach(flag => {
        const category = flag.split(".")[0]
        if (!flagList[category]) {
            flagList[category] = [flag]
        } else {
            flagList[category].push(flag)
        }
    })
    switch (params[1].toLowerCase()) {
        case "list": {
            if (!params[2]) {
                await quote(Object.keys(flagList).map(category => {
                    const flagCount = flagList[category].filter(item => flag.includes(item)).length
                    if (flagCount === 0) return `${category} [ ]`
                    if (flagCount === flagList[category].length) return `${category} [✓]`
                    return `${category} [*]`
                }).join("\n"))
            } else {
                if (!flagList[params[2]]) {
                    await quote(`类别${params[2]}不存在`)
                    return
                }
                await quote(flagList[params[2]].map(item => flag.includes(item) ? `${item} [✓] ${Core.Flag[item].description || "无简介"}` : `${item} [ ] ${Core.Flag[item].description || "无简介"}`).join("\n"))
            }
            return
        }
        case "enable": {
            if (!params[2]) {
                await quote(help)
            } else if (flagList[params[2]]) {
                const category = params[2]
                const disabledFlags = flagList[category].filter(item => !flag.includes(item))
                if (disabledFlags.length === 0) {
                    await quote(`类别${category}下没有未启用功能`)
                    return
                }
                Core.GroupFlag[group] = Core.GroupFlag[group] ? Core.GroupFlag[group].concat(disabledFlags) : disabledFlags
                Core.GroupFlag = Core.GroupFlag
                await quote(`已启用功能${disabledFlags.join(",")}`)
            } else if ((params[2] in Core.Flag)) {
                if (flag.includes(params[2])) {
                    await quote(`该功能未被禁用`)
                    return
                }
                Core.GroupFlag[group] = Core.GroupFlag[group] ? Core.GroupFlag[group].concat(params[2]) : [params[2]]
                Core.GroupFlag = Core.GroupFlag
                await quote(`已启用功能${params[2]}`)
            } else {
                const length = params[2].split(".").length
                if (length === 1) {
                    await quote(`类别${params[2]}不存在`)
                } else if (length === 2) {
                    await quote(`功能${params[2]}不存在`)
                } else {
                    await quote(help)
                }
            }
            return
        }
        case "disable": {
            if (!params[2]) {
                await quote(help)
            } else if (flagList[params[2]]) {
                const category = params[2]
                const enabledFlags = flagList[category].filter(item => flag.includes(item))
                if (enabledFlags.length === 0) {
                    await quote(`类别${category}下没有已启用功能`)
                    return
                }
                Core.GroupFlag[group] = Core.GroupFlag[group] ? Core.GroupFlag[group].filter(flag => !enabledFlags.includes(flag)) : []
                Core.GroupFlag = Core.GroupFlag
                await quote(`已启用功能${enabledFlags.join(",")}`)
            } else if (Object.keys(Core.Flag).includes(params[2])) {
                if (!flag.includes(params[2])) {
                    await quote(`该功能未被启用`)
                    return
                }
                Core.GroupFlag[group] = Core.GroupFlag[group] ? Core.GroupFlag[group].filter(flag => flag !== params[2]) : []
                Core.GroupFlag = Core.GroupFlag
                await quote(`已禁用功能${params[2]}`)
            } else {
                const length = params[2].split(".").length
                if (length === 1) {
                    await quote(`类别${params[2]}不存在`)
                } else if (length === 2) {
                    await quote(`功能${params[2]}不存在`)
                } else {
                    await quote(help)
                }
            }
            return
        }
    }
}