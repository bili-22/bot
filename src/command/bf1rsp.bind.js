export default async function ({ Core, group, alias, command, text, quote, botPermLevel }) {
    if (command !== "bf1rsp.bind") return
    if (botPermLevel < 1) {
        await quote(`该指令需要群管理权限`)
        return
    }
    const params = text.toLowerCase().split(/\s+/)
    const help = `${alias} list`
        + `\n${alias} bind <server> <name>`
        + `\n${alias} remove <name>`
    switch (params[1]) {
        case "list": {
            if (!Core.Config[group] || !Core.Config[group].bind) {
                await quote(`未绑定任何服务器`)
                return
            }
            await quote(Object.keys(Core.Config[group].bind).map(name => `${name} - ${Core.Config[group].bind[name]}`).join("\n"))
            return
        }
        case "bind": {
            if (!params[2] || !params[3]) {
                await quote(help)
                return
            }
            if (!Core.Config[group]) Core.Config[group] = {}
            if (!Core.Config[group].bind) Core.Config[group].bind = {}
            Core.Config[group].bind[params[3]] = params[2]
            Core.Config = Core.Config
            await quote(`已将${params[2]}绑定为${params[3]}`)
            return
        }
        case "remove": {
            if (!params[2]) {
                await quote(help)
                return
            }
            if (!Core.Config[group] || !Core.Config[group].bind || !(params[2] in Core.Config[group].bind)) {
                await quote(`未绑定该名称`)
                return
            }
            delete Core.Config[group].bind[params[2]]
            Core.Config = Core.Config
            await quote(`已将移除${params[2]}`)
            return
        }
        case "help": {
            const fullHelp = help
                + `\n示例:`
                + `\n${alias} list`
                + `\n${alias} bind baka1 1`
                + `\n${alias} remove 1`
            await quote(fullHelp)
            return
        }
        default:
            await quote(help)
            return
    }
}