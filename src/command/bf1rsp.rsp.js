import * as db from "../lib/db.js";

export default async function ({ alias, command, text, quote, botPermLevel }) {
    if (command !== "bf1rsp.rsp") return
    const help = `${alias} <群组> list`
        + `\n${alias} <群组> info`
        + `\n${alias} <群组> add <服务器> <#编号|Guid> <管理账号Id>`
        + `\n${alias} <群组> delete <服务器>`
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
            + `\n${alias} baka add baka1 #123 bot_bili22`
            + `\n${alias} baka delete baka1`
        await quote(fullHelp)
        return
    }
    if (!params[1] || !params[2]) {
        await quote(help)
        return
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
    const servers = await db.query(`SELECT g.name as name, s.name as serverName, g.guid as guid, id, expirationDate < CURRENT_TIMESTAMP isExpired FROM group_servers g LEFT JOIN servers s ON g.guid = s.guid WHERE g.group_name = ${db.escape(groupName)}`)
    switch (params[2].toLowerCase()) {
        case "info": {
            await quote(
                `群组名:${groupName}`
                +`\n服务器:${servers.map(server => server.name).join(",")}`
                +`\n绑定群:${group.bindGroups && group.bindGroups.length ? group.bindGroups.join(",") : "无"}`
            )
            return
        }
        case "list": {
            await quote(servers.sort((a,b) => a.name - b.name).map(server => {
                return `${server.serverName.slice(0, 20)}${server.id ? " #" + server.id : ""}${server.isExpired ? "(过期)" : ""}`
                    + `\nGuid:${server.guid}`
                    + `\n名称:${server.name}  群组:${groupName}`
            }).join("\n") || "无服务器")
            return
        }
        case "add": {
            if (!params[3] || !params[4] || !params[5]) {
                await quote(help)
                return
            }
            const name = params[3].toLowerCase()
            let id = params[4]
            const accountName = params[5]
            if (id.match(/^#[0-9]{1,4}$/)) {
                id = await db.query(`SELECT guid FROM servers WHERE id = ${db.escape(+id.substr(1))}`).then(result => result[0] && result[0].guid || null)
                if (!id) {
                    await quote(`服务器不存在`)
                    return
                }
            } else if (!id.match(/^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/)) {
                await quote(`编号格式错误`)
                return
            }
            const account = await db.query(`SELECT name, a.personaId as personaId, admin FROM accounts a LEFT JOIN players p ON a.personaId = p.personaId WHERE name = ${db.escape(accountName)}`).then(result => result[0] || null)
            if (!account) {
                await quote(`账号不存在`)
                return
            }
            if (!account.admin) {
                await quote(`账号未开启管理功能`)
                return
            }
            try {
                await db.query(`INSERT INTO group_servers (name, guid, group_name, account_id) VALUES (${db.escape(name)}, ${db.escape(id)}, ${db.escape(groupName)}, ${db.escape(account.personaId)})`)
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
        }
        default:
            await quote(help)
            return
    }
}