import { client } from "../lib/gateway.js";
import * as db from "../lib/db.js";
import moment from "moment";

const gameModes = { "征服": "Conquest", "信鸽": "Possession", "行动": "BreakthroughLarge", "死斗": "TeamDeathMatch", "突袭": "Rush", "闪击": "Breakthrough", "抢攻": "Domination", "前线": "TugOfWar", "空战": "AirAssault", "空投": "ZoneControl" }
const mapPrettyName = { "MP_Amiens": "亚眠", "MP_ItalianCoast": "帝国边境", "MP_ShovelTown": "攻占托尔", "MP_MountainFort": "格拉巴山", "MP_Graveyard": "决裂", "MP_FaoFortress": "法欧堡", "MP_Chateau": "捞薯餐厅", "MP_Scar": "圣康坦的伤痕", "MP_Suez": "苏伊士", "MP_Desert": "西奈沙漠", "MP_Forest": "阿尔贡森林", "MP_Giant": "庞然暗影", "MP_Verdun": "凡尔登高地", "MP_Trench": "尼维尔之夜", "MP_Underworld": "法乌克斯要塞", "MP_Fields": "苏瓦松", "MP_Valley": "加利西亚", "MP_Bridge": "勃鲁西洛夫关口", "MP_Tsaritsyn": "察里津", "MP_Ravines": "武普库夫山口", "MP_Volga": "窝瓦河", "MP_Islands": "阿尔比恩", "MP_Beachhead": "海丽丝岬", "MP_Harbor": "泽布吕赫", "MP_Ridge": "阿奇巴巴", "MP_River": "卡波雷托", "MP_Hell": "帕斯尚尔", "MP_Offensive": "索姆河", "MP_Naval": "黑尔戈兰湾", "MP_Blitz": "伦敦的呼唤：夜袭", "MP_London": "伦敦的呼唤：灾祸", "MP_Alps": "剃刀边缘" }
const modePrettyName = { "BreakthroughLarge": "行动模式", "Breakthrough": "闪击行动", "Conquest": "征服", "TugOfWar": "前线", "TeamDeathMatch": "团队死斗", "Possession": "战争信鸽", "Domination": "抢攻", "Rush": "突袭", "ZoneControl": "空降补给", "AirAssault": "空中突击" }

export default async function ({ alias, command, text, quote }) {
    if (command !== "bf1info.server") return
    const help = `${alias} [服务器名] [...模式|空位]`
    const params = text.split(/\s+/)
    if (!params[1]) {
        await quote(help)
        return
    }
    if (params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} dice`
            + `\n${alias} 行动 0-10`
            + `\n${alias} dice 行动 20-30`
        await quote(fullHelp)
        return
    }
    const filterJson = { "serverType": { "PRIVATE": "on", "RANKED": "on", "UNRANKED": "on" } }
    let paramCount = 0
    let from, to
    while (true) {
        const param = params.pop()
        if (gameModes[param]) {
            paramCount++
            if (!filterJson.gameModes) filterJson.gameModes = {}
            filterJson.gameModes[gameModes[param]] = "on"
            continue
        }
        if (param.match(/^[0-9]{1,2}-[0-9]{1,2}$/)) {
            from = +param.split("-")[0] > +param.split("-")[1] ? +param.split("-")[1] : +param.split("-")[0]
            to = +param.split("-")[0] < +param.split("-")[1] ? +param.split("-")[1] : +param.split("-")[0]
            paramCount++
            if (filterJson.slots) {
                await quote("只能存在一个人数筛选条件")
                return
            }
            filterJson.slots = {}
            if (from <= 0) filterJson.slots["none"] = "on"
            if (!(from < 1 && to < 1 || from > 5 && to > 5)) filterJson.slots["oneToFive"] = "on"
            if (!(from < 6 && to < 6 || from > 10 && to > 10)) filterJson.slots["sixToTen"] = "on"
            if (!(from < 10 && to < 10 || from > 63 && to > 63)) filterJson.slots["tenPlus"] = "on"
            if (to >= 64) filterJson.slots["all"] = "on"
            continue
        }
        break
    }
    if (params.length > 0) filterJson.name = text.replace(new RegExp("^.*?\\s+(.*?)" + "\\s+[^\\s]*?".repeat(paramCount) + "$"), "$1")
    try {
        const servers = await client({ method: "GameServer.searchServers", account: "default", params: { filterJson: JSON.stringify(filterJson), limit: 200 } })
            .then(result => from !== undefined && to !== undefined ? result.gameservers.filter(server => server.slots.Soldier.max - server.slots.Soldier.current >= from && server.slots.Soldier.max - server.slots.Soldier.current <= to) : result.gameservers)
        const ids = {}
        if (servers.length) await db.query(`SELECT guid, id FROM servers WHERE guid IN (${servers.map(server => db.escape(server.guid)).join(", ")})`).then(result => result.forEach(item => ids[item.guid] = item.id))
        let text
        if (servers.length === 0) {
            await quote('无结果')
            return
        } else if (servers.length === 1) {
            let detail
            try {
                detail = await client({ method: "GameServer.getFullServerDetails", account: "default", params: { gameId: servers[0].gameId } })
            } catch (error) {
                await quote('获取服务器信息失败')
                return
            }
            await quote(`${detail.serverInfo.name}${(detail.serverInfo.custom) ? ' [自定义]' : ''}${(detail.serverInfo.serverType === "PRIVATE") ? ' 🔒' : ''}${ids[detail.serverInfo.guid] && " #" + ids[detail.serverInfo.guid] || ""}`
                + `\n简介:${detail.serverInfo.description || '无'}`
                + `\n地图:${mapPrettyName[detail.serverInfo.mapName]}-${modePrettyName[detail.serverInfo.mapMode]}`
                + `\n人数:${detail.serverInfo.slots.Soldier.current}/${detail.serverInfo.slots.Soldier.max}[${detail.serverInfo.slots.Queue.current}](${detail.serverInfo.slots.Spectator.current}) ★${detail.serverInfo.serverBookmarkCount}`
                + `\n战队:${(detail.platoonInfo) ? `${detail.platoonInfo.name} [${detail.platoonInfo.tag}] ${detail.platoonInfo.size}` : '无'}`
                + `\n创建时间:${moment(+detail.rspInfo.server.createdDate).format('YY-MM-DD HH:mm:ss')}`
                + `\n到期时间:${moment(+detail.rspInfo.server.expirationDate).format('YY-MM-DD HH:mm:ss')}`)
            return
        } else if (servers.length <= 3) {
            text = servers.map(server =>
                `${server.name}${(server.serverType === "PRIVATE") ? ' 🔒' : ''}${ids[server.guid] && " #" + ids[server.guid] || ""}\n`
                + `简介:${server.description || '无'}\n`
                + `地图:${mapPrettyName[server.mapName]}-${modePrettyName[server.mapMode]}\n`
                + `人数:${server.slots.Soldier.current}/${server.slots.Soldier.max}[${server.slots.Queue.current}](${server.slots.Spectator.current})`
            ).join('\n\n')
        } else if (servers.length <= 7) {
            text = servers.map(server =>
                `${server.name.slice(0, 20)}${ids[server.guid] && " #" + ids[server.guid] || ""}\n`
                + `${mapPrettyName[server.mapName]}`
                + `${(server.mapMode === 'BreakthroughLarge' || server.mapMode === 'Breakthrough' || server.mapMode === 'Conquest') ? '' : '-' + modePrettyName[server.mapMode]}`
                + ` ${server.slots.Soldier.current}/${server.slots.Soldier.max}[${server.slots.Queue.current}]${(server.slots.Spectator.current === 0) ? '' : `(${server.slots.Spectator.current})`}`
            ).join('\n\n')
        } else {
            servers.sort((a, b) => b.slots.Soldier.current - a.slots.Soldier.current)
            text = servers.slice(0, 20).map(server =>
                `${server.name.slice(0, 15)}${ids[server.guid] && " #" + ids[server.guid] || ""}`
                + ` ${mapPrettyName[server.mapName]}`
                + ` ${server.slots.Soldier.current}/${server.slots.Soldier.max}`
            ).join('\n')
        }
        await quote(text)
        return
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
}