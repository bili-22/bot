import { client, checkPerm, searchPlayer } from "../lib/gateway.js";
import * as db from "../lib/db.js";
import moment from "moment";
import { scheduleJob } from "node-schedule";
import { getLogger } from "../../main.js";

const logger = getLogger("vipcheck")
scheduleJob('0 0 0 * * *', checkVip)
async function checkVip() {
    try {
        await db.query(`UPDATE server_vips SET pending = -1, expirationDate = null WHERE expirationDate < CURRENT_TIMESTAMP`)
        const vipList = await db.query(`SELECT personaId, guid, pending FROM server_vips WHERE pending != 0`)
        if (vipList.length) return
        const guidList = Array.from(new Set(vipList.map(i => i.guid)))
        const infoList = Object.fromEntries(await db.query(`SELECT s.guid as guid, rotation, serverId, account_id FROM servers s LEFT JOIN group_servers g ON s.guid = g.guid WHERE expirationDate > CURRENT_TIMESTAMP AND s.guid IN (${guidList.map(guid => db.escape(guid)).join(", ")})`).then(result => result.map(info => [info.guid, { serverId: info.serverId, account: info.account_id, isOperation: ["行動模式", "閃擊行動", "SHOCK OPERATIONS", "OPERATIONS"].includes(JSON.parse(info.rotation)[0].modePrettyName) }])))
        const jobList = vipList.filter(({ guid }) => guid in infoList && !infoList[guid].isOperation)

        const jobListBak = jobList.slice()
        while (jobList.length) {
            const reqs = jobList.splice(0, 50).map(item => client({ method: item.pending === 1 ? "RSP.addServerVip" : "RSP.removeServerVip", account: infoList[item.guid].account, params: { serverId: infoList[item.guid].serverId, personaId: item.personaId } }))
            await Promise.all(reqs)
        }
        if (jobListBak.filter(i => i.pending === -1).length) await db.query(`DELETE FROM server_vips WHERE ${jobListBak.filter(i => i.pending === -1).map(i => `(guid = ${db.escape(i.guid)} AND personaId = ${db.escape(i.personaId)})`).join(" OR ")}`)
        if (jobListBak.filter(i => i.pending === 1).length) await db.query(`UPDATE server_vips SET pending = 0 WHERE ${jobListBak.filter(i => i.pending === 1).map(i => `(guid = ${db.escape(i.guid)} AND personaId = ${db.escape(i.personaId)})`).join(" OR ")}`)
        logger.info(`处理了${jobListBak.length}个VIP`)
    } catch (error) {
        logger.error(error)
    }
}
const vipLists = new Map()

export default async function ({ alias, command, sender, group, text, quote, quoteId, aliases }) {
    if (command !== "bf1rsp.vip" && command !== "bf1rsp.unvip" && command !== "bf1rsp.vipList" && command !== "bf1rsp.vipCheck") return
    const params = text.toLowerCase().split(/\s+/)
    switch (command) {
        case "bf1rsp.vipList": {
            const help = `${alias} <server>`
            if (!params[1]) {
                await quote(help)
                return
            }
            break
        }
        case "bf1rsp.vipCheck": {
            const help = `${alias} <server>`
            if (!params[1]) {
                await quote(help)
                return
            }
            break
        }
        case "bf1rsp.vip": {
            const help = `${alias} <server> <player> [day]`
            if (params[1] === 'help') {
                await quote(help + `\n示例:\n${alias} 1 bilibili22 7\n${alias} 1 bilibili22 -5`)
                return
            }
            if (!params[1] || !params[2]) {
                await quote(help)
                return
            }
            break
        }
        case "bf1rsp.unvip": {
            const help = `${alias} <server> <player>\n回复VIP列表:${alias} <1> <2> <3> ...`
            if (!params[1] || !params[2] && !quoteId) {
                await quote(help)
                return
            }
            break
        }
    }
    if (command === "bf1rsp.unvip" && quoteId) {
        if (!vipLists.has(quoteId)) {
            await quote(`VIP列表不存在/已过期`)
            return
        }

        const perm = await checkPerm(vipLists.get(quoteId)[0], sender, group)
        if (!perm) {
            await quote(`服务器${vipLists.get(quoteId)[0]}不存在`)
            return
        } else if (!perm.admin) {
            await quote(`你不是群组${perm.group}的管理员`)
            return
        }
        const { name, serverId, guid, rotation, account } = perm
        const isOperation = ["行動模式", "閃擊行動", "SHOCK OPERATIONS", "OPERATIONS"].includes(JSON.parse(rotation)[0].modePrettyName)

        const vipList = vipLists.get(quoteId)[1]
        const indexes = Array.from(new Set(params.slice(1).map(i => +i)))
        if (indexes.find(index => !index || !vipList[index - 1] || vipList[index - 1].pending === -1)) {
            await quote(`序号无效`)
            return
        }
        const removeList = vipList.filter((item, index) => indexes.includes(index + 1))
        if (isOperation) {
            await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId IN (${removeList.map(i => i.personaId).join(", ")}) AND pending = 1`)
            await db.query(`UPDATE server_vips SET expirationDate = null, pending = -1 WHERE guid = ${db.escape(guid)} AND personaId IN (${removeList.map(i => i.personaId).join(", ")})`)
            await quote(`将在${name}(行动)移除${removeList.map(i => i.name).join(",")}的VIP\n检查VIP以使其生效`)
        } else {
            try {
                await Promise.all(removeList.filter(i => i.pending !== 1).map(i => client({ method: "RSP.removeServerVip", account, params: { personaId: i.personaId, serverId } })))
            } catch (error) {
                if (error.name === "GatewayError") {
                    await quote(error.message)
                    return
                }
                throw error
            }
            await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId IN (${removeList.map(i => i.personaId).join(", ")})`)
            await quote(`已在${name}移除${removeList.map(i => i.name).join(",")}的VIP`)
        }
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
    const { name, serverId, gameId, guid, rotation, account } = perm
    const isOperation = ["行動模式", "閃擊行動", "SHOCK OPERATIONS", "OPERATIONS"].includes(JSON.parse(rotation)[0].modePrettyName)
    const now = new Date().getTime()
    const dbVipList = await db.query(`SELECT name, v.personaId as personaId, UNIX_TIMESTAMP(createAt) * 1000 as createAt, UNIX_TIMESTAMP(expirationDate) * 1000 as expirationDate, pending FROM server_vips v LEFT JOIN players p ON v.personaId = p.personaId WHERE guid = ${db.escape(guid)}`).then(result => new Map(result.map(item => [+item.personaId, item])))
    if (command === "bf1rsp.vipCheck") {
        const vipList = Array.from(dbVipList.values()).filter(i => i.pending)
        if (!vipList.length) {
            await quote(`VIP列表完整,无需检查`)
            return
        }
        const { serverInfo, rspInfo } = await client({ method: "GameServer.getFullServerDetails", account, params: { gameId } })
        const serverVipList = rspInfo.vipList.map(i => +i.personaId)
        if ((serverInfo.mapMode === "Breakthrough" || serverInfo.mapMode === "BreakthroughLarge") && !(serverInfo.slots.Soldier.current + serverInfo.slots.Spectator.current)) {
            await quote(`服务器内没有玩家`)
            return
        }
        await Promise.all(vipList.filter(i => i.pending === -1 && serverVipList.includes(i.personaId)).map(({ personaId }) => client({ method: "RSP.removeServerVip", account, params: { personaId, serverId } })))
        await Promise.all(vipList.filter(i => i.pending === 1 && !serverVipList.includes(i.personaId)).map(({ personaId }) => client({ method: "RSP.addServerVip", account, params: { personaId, serverId } })))

        if (vipList.filter(i => i.pending === -1).length) await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId IN (${vipList.filter(i => i.pending === -1).map(i => db.escape(i.personaId)).join(", ")})`)
        if (vipList.filter(i => i.pending === 1).length) await db.query(`UPDATE server_vips SET pending = 0 WHERE guid = ${db.escape(guid)} AND personaId IN (${vipList.filter(i => i.pending === 1).map(i => db.escape(i.personaId)).join(", ")})`)

        if ((serverInfo.mapMode === "Breakthrough" || serverInfo.mapMode === "BreakthroughLarge") && (serverInfo.slots.Soldier.current + serverInfo.slots.Spectator.current < 20)) {
            const mapList = serverInfo.rotation.map(i => i.mapImage.split("/").pop().split("_").slice(0, 2).join("_").toLowerCase())
            await client({ method: "RSP.chooseLevel", account, params: { persistedGameId: guid, levelIndex: mapList.indexOf(serverInfo.mapName.toLowerCase()) } })
        }
        await quote(`添加了${vipList.filter(i => i.pending === 1).length}个VIP,移除了${vipList.filter(i => i.pending === -1).length}个VIP`)
        return
    }
    if (command === "bf1rsp.vipList") {
        const { vipList } = await client({ method: "RSP.getServerDetails", account, params: { serverId } })
        vipList.forEach(({ name, personaId }) => {
            if (!dbVipList.has(+personaId)) dbVipList.set(+personaId, {
                name, personaId: +personaId, createAt: now, expirationDate: null, pending: 0
            })
        })
        if (!dbVipList.size) {
            await quote(`服务器无VIP`)
            return
        }
        const messageId = await quote(Array.from(dbVipList.values()).map(({ name, createAt, expirationDate, pending }, index) => `${index + 1}. ${name}${pending !== 0 ? (pending > 0 ? "[待生效]" : "[待删除]") : ""}${expirationDate ? ` (${moment(expirationDate).format('MM-DD')})` : ""}`).join("\n") + `\n可以使用${aliases["bf1rsp.unvip"]}删除列表内的VIP`)
        vipLists.set(messageId, [name, Array.from(dbVipList.values()).map(({ name, personaId, pending }) => ({ name, personaId, pending }))])
        setTimeout(() => {
            vipLists.delete(messageId)
        }, 600000);
        return
    }
    const persona = await searchPlayer({ name: params[2] })
    if (!persona) {
        await quote(`玩家不存在`)
        return
    }
    if (command === "bf1rsp.vip") {
        const removed = dbVipList.has(+persona.personaId) ? dbVipList.get(+persona.personaId).pending === -1 : false
        if (params[3] && !+params[3]) {
            await quote(`天数不合法`)
            return
        }
        if (dbVipList.has(+persona.personaId) && !removed) {
            if (dbVipList.get(+persona.personaId).expirationDate) {
                if (params[3]) {
                    const time = dbVipList.get(+persona.personaId).expirationDate / 1000 + +params[3] * 86400
                    if (time > now / 1000) {
                        await db.query(`UPDATE server_vips SET expirationDate = FROM_UNIXTIME(${time}) WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                        await quote(`已在${name}为${persona.name}${+params[3] > 0 ? "增加" : "扣除"}${-(+params[3])}天的VIP(${moment(dbVipList.get(+persona.personaId).expirationDate + +params[3] * 86400000).format('MM-DD')})`)
                    } else {
                        if (dbVipList.get(+persona.personaId).pending === 1) {
                            await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                            await quote(`已在${name}移除${persona.name}的VIP`)
                        } else {
                            if (isOperation) {
                                await db.query(`UPDATE server_vips SET expirationDate = null, pending = -1 WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                                await quote(`将在${name}(行动)移除${persona.name}的VIP\n检查VIP以使其生效`)
                            } else {
                                try {
                                    await client({ method: "RSP.removeServerVip", account, params: { personaId: persona.personaId, serverId } })
                                } catch (error) {
                                    if (error.name === "GatewayError") {
                                        await quote(error.message)
                                        return
                                    }
                                    throw error
                                }
                                await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                                await quote(`已在${name}移除${persona.name}的VIP`)
                            }
                        }
                    }
                } else {
                    await db.query(`UPDATE server_vips SET expirationDate = null WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                    await quote(`已在${name}将${persona.name}设置为永久VIP`)
                }
            } else {
                await quote(`玩家已经是永久VIP了`)
            }
            return
        }
        if (+params[3] < 0) {
            await quote(`无法添加负天数VIP`)
            return
        }
        if (removed) {
            await db.query(`UPDATE server_vips SET pending = 0, expirationDate = ${params[3] ? ", FROM_UNIXTIME(" + db.escape(Math.floor(new Date().getTime() / 1000) + +params[3] * 86400) + ")" : "null"} WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
            await quote(`已将${persona.name}设置为${name}的VIP(${params[3] ? moment(new Date().getTime() + +params[3] * 86400000).format('MM-DD') : "永久"})`)
            return
        } else {
            if (isOperation) {
                await db.query(`INSERT INTO server_vips (pending, guid, personaId${params[3] ? ", expirationDate" : ""}) VALUES (1, ${db.escape(guid)}, ${db.escape(persona.personaId)}${params[3] ? ", FROM_UNIXTIME(" + db.escape(Math.floor(new Date().getTime() / 1000) + +params[3] * 86400) + ")" : ""})`)
                await quote(`将${persona.name}设置为${name}(行动)的VIP(${params[3] ? moment(new Date().getTime() + +params[3] * 86400000).format('MM-DD') : "永久"})\n检查VIP以使其生效`)
                return
            } else {
                try {
                    await client({ method: "RSP.addServerVip", account, params: { personaId: persona.personaId, serverId } })
                } catch (error) {
                    if (!(error.error && error.error.message === 'RspErrUserIsAlreadyVip()')) {
                        if (error.name === "GatewayError") {
                            await quote(error.message)
                            return
                        }
                        throw error
                    }
                }
                await db.query(`INSERT INTO server_vips (guid, personaId${params[3] ? ", expirationDate" : ""}) VALUES (${db.escape(guid)}, ${db.escape(persona.personaId)}${params[3] ? ", FROM_UNIXTIME(" + db.escape(Math.floor(new Date().getTime() / 1000) + +params[3] * 86400) + ")" : ""})`)
                await quote(`已将${persona.name}设置为${name}的VIP(${params[3] ? moment(new Date().getTime() + +params[3] * 86400000).format('MM-DD') : "永久"})`)
                return
            }
        }
    }
    if (command === "bf1rsp.unvip") {
        const { vipList } = await client({ method: "RSP.getServerDetails", account, params: { serverId } })
        if ((!dbVipList.has(+persona.personaId) || dbVipList.get(+persona.personaId).pending === -1) && !vipList.find(i => +i.personaId === +persona.personaId)) {
            await quote(`玩家不是${name}的VIP`)
            return
        }
        if (dbVipList.get(+persona.personaId).pending === 1) {
            await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
            await quote(`已在${name}移除${persona.name}的VIP`)
            return
        } else {
            if (isOperation) {
                await db.query(`UPDATE server_vips SET expirationDate = null, pending = -1 WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                await quote(`将在${name}(行动)移除${persona.name}的VIP\n检查VIP以使其生效`)
            } else {
                try {
                    await client({ method: "RSP.removeServerVip", account, params: { personaId: persona.personaId, serverId } })
                } catch (error) {
                    if (error.name === "GatewayError") {
                        await quote(error.message)
                        return
                    }
                    throw error
                }
                await db.query(`DELETE FROM server_vips WHERE guid = ${db.escape(guid)} AND personaId = ${db.escape(persona.personaId)}`)
                await quote(`已在${name}移除${persona.name}的VIP`)
            }
            return
        }
    }
}