import { client, searchPlayer } from "../lib/gateway.js";
import * as db from "../lib/db.js";
import moment from "moment";

export default async function ({ alias, command, text, quote }) {
    if (command !== "bf1info.info") return
    const help = `${alias} <id>`
    const params = text.split(/\s+/)
    if (!params[1]) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "help") {
        const fullHelp = help +
            `\n可以使用的id包括`
            + `\n服务器:编号(加#)\n,ServerId,GameId,Guid`
            + `\n战队:Guid`
            + `\n玩家:玩家名,PersonaId(加#)`
        await quote(fullHelp)
        return
    }
    const id = text.replace(/^.*?\s+/, "")
    if (id.match(/^#[0-9]{1,4}$/)) { //编号
        const servers = await db.query(`SELECT name, id, guid, serverId, gameId, serverBookmarkCount, UNIX_TIMESTAMP(createdDate) createdDate, UNIX_TIMESTAMP(expirationDate) expirationDate FROM servers WHERE id = ${db.escape(id.substr(1))}`)
        if (servers.length) {
            await serverInfo(servers[0])
            return
        }
    } else if (id.match(/^[0-9]{13,14}$/)) { //GameId
        const servers = await db.query(`SELECT name, id, guid, serverId, gameId, serverBookmarkCount, UNIX_TIMESTAMP(createdDate) createdDate, UNIX_TIMESTAMP(expirationDate) expirationDate FROM servers WHERE gameId = ${db.escape(id)}`)
        if (servers.length) {
            await serverInfo(servers[0])
            return
        }
    } else if (id.match(/^[0-9]{5,8}$/)) { //ServerId
        const servers = await db.query(`SELECT name, id, guid, serverId, gameId, serverBookmarkCount, UNIX_TIMESTAMP(createdDate) createdDate, UNIX_TIMESTAMP(expirationDate) expirationDate FROM servers WHERE serverId = ${db.escape(id)}`)
        if (servers.length) {
            await serverInfo(servers[0])
            return
        } else {
            const playerInfo = await searchPlayer({ name: id })
            if (playerInfo) {
                await quote(
                    `玩家信息`
                    + `\n名称:${playerInfo.name}`
                    + `\nPersonaId:${playerInfo.personaId}`
                    + `\nUserId:${playerInfo.userId}`
                )
                return
            }
        }
    } else if (id.match(/^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/)) { //两种Guid
        const servers = await db.query(`SELECT name, id, guid, serverId, gameId, serverBookmarkCount, UNIX_TIMESTAMP(createdDate) createdDate, UNIX_TIMESTAMP(expirationDate) expirationDate FROM servers WHERE guid = ${db.escape(id)}`)
        if (servers.length) {
            await serverInfo(servers[0])
            return
        } else {
            try {
                const platoonInfo = await client({ method: "Platoons.getPlatoon", account: "default", params: { guid: id } })
                await quote(
                    `战队信息`
                    + `\nGuid:${platoonInfo.guid}`
                    + `\n名称:[${platoonInfo.tag}]${platoonInfo.name}`
                    + `\n人数:${platoonInfo.size}`
                    + `\n创建时间:${moment(+platoonInfo.dateCreated * 1000).format('YY-MM-DD HH:mm:ss')}`
                    + `\n简介:${platoonInfo.description || "无"}`
                )
                return
            } catch (error) {
                if (error.name === "GatewayError") {
                    if (error.message !== "战队不存在") {
                        await quote(error.message)
                        return
                    }
                } else {
                    throw error
                }
            }
        }
    } else if (id.match(/^#[0-9]{5,}$/) || id.match(/^[A-Za-z0-9\-_]{4,}$/)) { //玩家名
        const playerInfo = await searchPlayer({ name: id })
        if (playerInfo) {
            await quote(
                `玩家信息`
                + `\n名称:${playerInfo.name}`
                + `\nPersonaId:${playerInfo.personaId}`
                + `\nUserId:${playerInfo.userId}`
            )
            return
        }
    } else {
        await quote(`Id不符合规范,请使用[${alias} help]查看介绍`)
        return
    }
    await quote(`无结果`)
    return
    async function serverInfo(server) {
        const isExpired = new Date().getTime() / 1000 > server.expirationDate
        await quote(
            `服务器信息`
            + `\n名称:${server.name}`
            + `\nGuid:${server.guid}`
            + (isExpired ? `` : `\nGameId:${server.gameId}`)
            + `\nServerId:${server.serverId}`
            + (isExpired ? `\n` : `\n编号:#${server.id}    `)
            + `收藏数:${server.serverBookmarkCount}`
            + `\n创建时间:${moment(server.createdDate * 1000).format('YY-MM-DD HH:mm:ss')}`
            + `\n${new Date().getTime() / 1000 < server.expirationDate ? "到" : "过"}期时间:${moment(server.expirationDate * 1000).format('YY-MM-DD HH:mm:ss')}`
        )
    }
}