import { client, checkPerm, searchPlayer } from "../lib/gateway.js";

export default async function ({ alias, command, sender, group, text, quote }) {
    if (command !== "bf1rsp.ban" && command !== "bf1rsp.unban") return
    const isban = command === "bf1rsp.ban" ? true : false
    const help = `${alias} <server> <player>`
    const params = text.toLowerCase().split(/\s+/)
    if (params[1] === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} 1 bilibili22`
        await quote(fullHelp)
        return
    }
    if (!params[1] || !params[2]) {
        await quote(help)
        return
    }
    const perm = await checkPerm(params[1], sender, group)
    if (!perm) {
        await quote(`服务器${params[1]}不存在`)
        return
    } else if (!perm.admin) {
        await quote(`你不是群组${perm.group}的管理员`)
        return
    }
    const { serverId, account } = perm
    const persona = await searchPlayer({ name: params[2] })
    if (!persona) {
        await quote(`玩家不存在`)
        return
    }
    try {
        await client({ method: isban ? "RSP.addServerBan" : "RSP.removeServerBan", account: account, params: { serverId, personaId: persona.personaId } })
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
    await quote(`已在${perm.name}中${isban ? "封禁" : "解封"}${persona.name}`)
}