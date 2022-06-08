import * as db from "../lib/db.js";
import { client } from "../lib/gateway.js";

export default async function ({ alias, sender, command, text, quote, botPermLevel }) {
    if (command !== "bf1rsp.spy") return
    const help = `${alias} <群组>`
    const params = text.toLowerCase().split(/\s+/)
    if (!params[1]) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} baka`
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
    const personaIds = []
    const guids = []
    const personas = {}
    await db.query(`SELECT a.guid as guid, a.personaId, p.name FROM group_servers s LEFT JOIN (server_admins a LEFT JOIN players p ON a.personaId = p.personaId) ON s.guid = a.guid WHERE group_name = ${db.escape(params[1])}`).then(result => result.forEach(item => {
        personas[item.personaId] = item.name
        if (!personaIds.includes(item.personaId)) personaIds.push(item.personaId)
        if (!guids.includes(item.guid)) guids.push(item.guid)
    }))
    const serverList = await client({ method: "GameServer.getServersByPersonaIds", account: "default", params: { personaIds } })
    if (!Object.keys(serverList).find(personaId => serverList[personaId])) {
        await quote(`该群组无管理在线`)
        return
    }
    const inServer = {}
    const notInServer = {}
    Object.keys(serverList)
        .filter(personaId => serverList[personaId])
        .forEach(personaId => {
            if (guids.includes(serverList[personaId].guid)) {
                if (!inServer[serverList[personaId].name]) inServer[serverList[personaId].name] = []
                inServer[serverList[personaId].name].push(personas[personaId])
            } else {
                if (!notInServer[serverList[personaId].name]) notInServer[serverList[personaId].name] = []
                notInServer[serverList[personaId].name].push(personas[personaId])
            }
        })
    await quote(`在岗:${Object.keys(inServer).length ? "\n" + Object.keys(inServer).sort().map(name => `${name.replace(/\s+/g, "").slice(0, 20)}\n${inServer[name].map((name, i) => `${i + 1}. ${name}`).join("\n")}`).join("\n") : "无"}`
        + `\n离岗:${Object.keys(notInServer).length ? "\n" + Object.keys(notInServer).sort().map(name => `${name.replace(/\s+/g, "").slice(0, 20)}\n${notInServer[name].map((name, i) => `${i + 1}. ${name}`).join("\n")}`).join("\n") : "无"}`
    )
}