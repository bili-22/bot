import * as db from "../lib/db.js";
import { client } from "../lib/gateway.js";

export default async function ({ alias, sender, command, text, quote,botPermLevel }) {
    if (command !== "bf1rsp.spy") return
    const help = `${alias} <群组>`
    const params = text.toLowerCase().split(/\s+/)
    await quote(`该功能维护中`)
    return
    if (!params[1]) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} baka1`
        await quote(fullHelp)
        return
    }
    const result = await db.query(`SELECT name FROM \`groups\` WHERE name = ${db.escape(params[1])} UNION SELECT qq FROM group_admins WHERE group_name = ${db.escape(params[1])} AND qq = ${db.escape(sender)}`)
    if (!result.length) {
        await quote(`群组${params[1]}不存在`)
        return
    }
    if (result.length < 2 && botPermLevel < 4) {
        await quote(`你不是群组${result[0].name}的管理员`)
        return
    }
    const result1 = await db.query(`SELECT a.guid as guid, personaId FROM group_servers s LEFT JOIN server_admins a ON s.guid = a.guid WHERE group_name = ${db.escape(params[1])}`)
    const { guid, name, id } = servers[0]
    const personas = {}
    const adminList = await db.query(`SELECT a.personaId as personaId, name FROM server_admins a LEFT JOIN players p ON p.personaId = a.personaId WHERE guid = ${db.escape(guid)}`)
    adminList.forEach(persona => personas[persona.personaId] = persona.name)
    const serverList = await client({ method: "GameServer.getServersByPersonaIds", account: "default", params: { personaIds: adminList.map(i => i.personaId) } })
    if (!Object.keys(serverList).find(personaId => serverList[personaId])) {
        await quote(`该服务器无管理在线`)
        return
    }
    const inServer = Object.keys(serverList).filter(personaId => serverList[personaId] && serverList[personaId].guid === guid).map(personaId => personas[personaId])
    const notInServer = {}
    Object.keys(serverList)
        .filter(personaId => serverList[personaId] && serverList[personaId].guid !== guid)
        .forEach(personaId => notInServer[serverList[personaId].name] ? notInServer[serverList[personaId].name].push(personas[personaId]) : (notInServer[serverList[personaId].name] = [personas[personaId]]))
    await quote(
        `${name.slice(0, 20)} #${id}`
        + `\n在岗:${inServer.length ? "\n" + inServer.join("\n") : "无"}`
        + `\n离岗:${Object.keys(notInServer).length ? "\n" + Object.keys(notInServer).sort().map(name => `${name.replace(/\s+/g, "").slice(0, 20)}\n${notInServer[name].map((name, i) => `${i + 1}. ${name}`).join("\n")}`).join("\n") : "无"}`
    )
}