import { client, checkPerm, searchPlayer, tify } from "../lib/gateway.js";

const reasons = {
    "RULEVIOLATION": "违反规则",
    "OFFENSIVEBEHAVIOR": "攻击性行为",
    "LATENCY": "延迟",
    "ADMINPRIORITY": "腾出空间",
    "GENERAL": "管理员踢出"
}

export default async function ({ alias, command, sender, group, text, quote }) {
    if (command !== "bf1rsp.kick") return
    const help = `${alias} <server> <player> [reason]`
    const params = text.toLowerCase().split(/\s+/)
    if (params[1] === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} 1 bilibili22`
            + `\n${alias} 1 bilibili22 等级限制`
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
    const { gameId, account } = perm
    const reason = params[3] && params[3].toUpperCase() !== "ADMINPRIORITY" ? tify(text.replace(/^.*?\s+.*?\s+.*\s+/, "")) : "RULEVIOLATION"
    let length = 0
    for (let i = 0; i < reason.length; i++) {
        if (/[^\x00-\xFF]/.test(reason.charAt(i))) {
            length += 3
        } else {
            length++
        }
    }
    if (length > 32) {
        await quote(`踢人原因过长`)
        return
    }
    const persona = await searchPlayer({ name: params[2] })
    if (!persona) {
        await quote(`玩家不存在`)
        return
    }
    try {
        await client({ method: "RSP.kickPlayer", account: account, params: { gameId, personaId: persona.personaId, reason } })
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
    await quote(`已在${perm.name}中踢出${persona.name}(${reasons[reason] || reason})`)
}