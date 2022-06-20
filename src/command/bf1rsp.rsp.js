import * as db from "../lib/db.js";
import { client, login, searchPlayer } from "../lib/gateway.js";

export default async function ({ alias, type, command, text, quote, botPermLevel }) {
    if (command !== "bf1rsp.rsp") return
    const help = `${alias} <群组> list`
        + `\n${alias} <群组> info`
        + `\n${alias} <群组> add <服务器> <#编号|Guid> [管理账号Id]`
        + `\n${alias} <群组> delete <服务器>`
        + `\n${alias} login <remid>`
        + `\n${alias} status [account]`
    if (botPermLevel < 4) {
        await quote(`指令需要超级管理员权限`)
        return
    }
    const params = text.split(/\s+/)
    if (params[1] && params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} baka list`
            + `\n${alias} baka info`
            + `\n${alias} baka add baka1 #123`
            + `\n${alias} baka delete baka1`
        await quote(fullHelp)
        return
    }
    if (!params[1] || params[1].toLowerCase() !== "status" && !params[2]) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "login") {
        if (type === 'GroupMessage') {
            await quote(`该功能仅允许私聊使用`)
            return
        }
        try {
            const { remid, sid, sessionId, personaId } = await login({ remid: params[2] })
            await quote(`正在创建玩家档案`)
            const { gameservers: servers } = await client({ sessionId, method: "GameServer.searchServers", params: { filterJson: "{\"slots\":{\"all\":\"on\"}}", limit: 1 } })
            if (!servers[0]) {
                await quote(`未找到可用的服务器`)
                return
            }
            const { status } = await client({ sessionId, method: Buffer.from(`R2FtZS5yZXNlcnZlU2xvdA==`, "base64").toString(), params: JSON.parse(Buffer.from(`eyJnYW1lIjoidHVuZ3Vza2EiLCJnYW1lUHJvdG9jb2xWZXJzaW9uIjoiMzc3OTc3OSIsImdhbWVJZCI6Ig==`, "base64").toString() + servers[0].gameId + Buffer.from(`IiwiY3VycmVudEdhbWUiOiJ0dW5ndXNrYSIsInNldHRpbmdzIjp7InJvbGUiOiJzcGVjdGF0b3IifX0=`, "base64").toString()) })
            if (status !== "Joined") {
                await quote(`创建失败`)
                return
            }
            const { name } = await searchPlayer({ personaId })
            await db.query(`INSERT INTO accounts (personaId, remid, sid, sessionId, admin) VALUES (${db.escape(personaId)}, ${db.escape(remid)}, ${db.escape(sid)}, ${db.escape(sessionId)}, 1) ON DUPLICATE KEY UPDATE remid=VALUES(remid), sid=VALUES(sid), sessionId=VALUES(sessionId), available=1`)
            await quote(`已添加账号${name}`)
            return
        } catch (error) {
            if (error.name === "Error") {
                await quote(error.message)
                return
            }
            throw error
        }
    }
    if (params[1].toLowerCase() === "status") {
        if (!params[2]) {
            const accountList = await db.query(`SELECT p.name as name, p.personaId as personaId, sessionId FROM accounts a LEFT JOIN players p ON a.personaId = p.personaId WHERE admin = 1`)
            const countList = await db.query(`SELECT personaId, COUNT(a.guid) as count FROM server_admins a LEFT JOIN servers s ON a.guid = s.guid WHERE expirationDate > CURRENT_TIMESTAMP AND personaId IN (${accountList.map(i => i.personaId).join(", ")}) GROUP BY personaId`)
            await Promise.all(accountList.map((a, i) => client({ method: "Companion.isLoggedIn", sessionId: a.sessionId }).then(result => accountList[i].isLoggedIn = result.isLoggedIn)))
            const counts = Object.fromEntries(countList.map(item => [item.personaId, item.count]))
            await quote(accountList.sort((a, b) => a.name.localeCompare(b.name)).map(item => `${item.name}${item.isLoggedIn ? "" : "*"}(${counts[item.personaId] || 0})`).join("\n"))
            return
        } else {
            const result = await db.query(`SELECT p.name as pname, s.name as name, expirationDate < CURRENT_TIMESTAMP as isExpired, id FROM (accounts a LEFT JOIN (server_admins sa LEFT JOIN servers s ON sa.guid = s.guid) ON a.personaId = sa.personaId) LEFT JOIN players p ON a.personaId = p.personaId WHERE admin = 1 AND p.name = ${db.escape(params[2])}`)
            if (!result.length) {
                await quote(`无信息`)
                return
            }
            await quote(`${result[0].pname}管理的服务器:\n` + result.sort((a, b) => a.name.localeCompare(b.name)).map(item => `${item.name.slice(0, 20)}${item.id ? " #" + item.id : ""}${item.isExpired ? "(已过期)" : ""}`).join("\n"))
            return
        }
    }
    let group = await db.query(`SELECT * FROM \`groups\` WHERE name = ${db.escape(params[1].toLowerCase())}`).then(result => result[0] || null)
    if (!group) {
        if (params[2].toLowerCase() === "add") {
            await db.query(`INSERT INTO \`groups\` (name) VALUES (${db.escape(params[1].toLowerCase())})`)
            group = { name: params[1].toLowerCase() }
        } else {
            await quote(`群组${params[1].toLowerCase()}不存在`)
            return
        }
    }
    const groupName = group.name
    const servers = await db.query(`SELECT g.name as name, s.name as serverName, g.guid as guid, p.name as account, id, expirationDate < CURRENT_TIMESTAMP isExpired FROM (group_servers g LEFT JOIN players p ON g.account_id = p.personaId) LEFT JOIN servers s ON g.guid = s.guid WHERE g.group_name = ${db.escape(groupName)}`)
    switch (params[2].toLowerCase()) {
        case "info": {
            await quote(
                `群组名:${groupName}`
                + `\n服务器:${servers.map(server => server.name).join(",")}`
                + `\n绑定群:${group.bindGroups && group.bindGroups.length ? group.bindGroups.join(",") : "无"}`
            )
            return
        }
        case "list": {
            await quote(servers.sort((a, b) => a.name.localeCompare(b.name)).map(server => {
                return `${server.serverName.slice(0, 20)}${server.id ? " #" + server.id : " " + server.guid}${server.isExpired ? "(过期)" : ""}`
                    + `\n名称:${server.name}  账号:${server.account}`
            }).join("\n") || "无服务器")
            return
        }
        case "add": {
            if (!params[3] || !params[4]) {
                await quote(help)
                return
            }
            const name = params[3].toLowerCase()
            if (name.length < 3) {
                await quote(`服务器名称过短`)
                return
            }
            const id = params[4]
            let guid, gameId
            if (id.match(/^#[0-9]{1,4}$/)) {
                await db.query(`SELECT guid, gameId FROM servers WHERE id = ${db.escape(+id.substr(1))}`).then(result => result[0] && (guid = result[0].guid, gameId = result[0].gameId))
                if (!guid || !gameId) {
                    await quote(`服务器不存在`)
                    return
                }
            } else if (id.match(/^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/)) {
                await db.query(`SELECT guid, gameId FROM servers WHERE guid = ${db.escape(id)}`).then(result => result[0] && (guid = result[0].guid, gameId = result[0].gameId))
                if (!guid || !gameId) {
                    await quote(`服务器不存在`)
                    return
                }
            } else {
                await quote(`编号格式错误`)
                return
            }
            let account
            if (params[5]) {
                const accountName = params[5]
                account = await db.query(`SELECT name, a.personaId as personaId, admin FROM accounts a LEFT JOIN players p ON a.personaId = p.personaId WHERE name = ${db.escape(accountName)}`).then(result => result[0] || null)
                if (!account) {
                    await quote(`账号不存在`)
                    return
                }
                if (!account.admin) {
                    await quote(`账号未开启管理功能`)
                    return
                }
            } else {
                const { rspInfo } = await client({ method: "GameServer.getFullServerDetails", account: "default", params: { gameId } })
                const result = await db.query(`SELECT a.personaId as personaId, name FROM accounts a LEFT JOIN players p ON a.personaId = p.personaId WHERE admin=1 AND a.personaId IN (${rspInfo.adminList.map(persona => persona.personaId).join(", ")})`)
                if (!result[0]) {
                    await quote(`未检测到账号,请手动指定账号`)
                    return
                }
                account = result[0]
            }
            try {
                await db.query(`INSERT INTO group_servers (name, guid, group_name, account_id) VALUES (${db.escape(name)}, ${db.escape(guid)}, ${db.escape(groupName)}, ${db.escape(account.personaId)})`)
            } catch (error) {
                if (error.code === "ER_DUP_ENTRY") {
                    await quote(`服务器已存在,要修改信息请先删除`)
                    return
                }
                if (error.code === "ER_NO_REFERENCED_ROW_2") {
                    await quote(`服务器不存在`)
                    return
                }
                throw error
            }
            await quote(`已为${groupName}添加${name}(${account.name})`)
            return
        }
        case "delete": {
            if (!params[3]) {
                await quote(help)
                return
            }
            const name = params[3].toLowerCase()
            if (!servers.find(server => server.name === name)) {
                await quote(`服务器不存在`)
                return
            }
            await db.query(`DELETE FROM group_servers WHERE name = ${db.escape(name)}`)
            await quote(`已在${groupName}中删除${name}`)
            return
        }
        default:
            await quote(help)
            return
    }
}