import { searchPlayer, client } from "../lib/gateway.js";
import * as db from "../lib/db.js";
import { sify } from "chinese-conv";

export default async function ({ alias, aliases, sender, command, text, quote }) {
    if (command !== "bf1info.vehicle") return
    const help =
        `${alias} [player] [地面|空中|海洋]`
        + `\n可以使用[${aliases["bf1info.bind"][0]}]绑定账号`
    const params = text.split(/\s+/)
    if (params[1] && params[1].toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} bilibili22`
            + `\n${alias} 地面`
            + `\n${alias} bilibili22 海洋`
        await quote(fullHelp)
        return
    }
    const categories = ['地面', '空中', '海洋']
    let category = params.slice().pop()
    let persona
    const isCategory = categories.includes(category)
    if (isCategory ? params.length > 2 : params.length > 1) {
        try {
            persona = await searchPlayer({ name: isCategory ? text.replace(/^.*?\s+(.*?)\s+[^\s]*?$/, "$1") : text.replace(/^.*?\s+/, "") })
        } catch (error) {
            if (error.name === "GatewayError") {
                await quote(error.message)
                return
            }
            throw error
        }
    } else {
        const result = await db.query(`SELECT personaId FROM bind_players WHERE qq = ${db.escape(sender)}`)
        if (!result[0]) {
            await quote(help)
            return
        }
        try {
            persona = await searchPlayer({ personaId: result[0].personaId })
        } catch (error) {
            if (error.name === "GatewayError") {
                await quote(error.message)
                return
            }
            throw error
        }
    }
    if (!persona) {
        await quote(isCategory ? `请先绑定` : `玩家不存在`)
        return
    }

    const result = await client({ method: "Progression.getVehiclesByPersonaId", account: "default", params: { personaId: persona.personaId } })
    let vehicles = []
    result.forEach(category => {
        if (category.name === '地面載具') {
            vehicles.push({
                id: 'Car',
                name: '棺材车',
                kill: category.stats.values.kills || 0,
                destroyed: category.stats.values.destroyed || 0,
                time: Math.floor(+category.stats.values.seconds) || 0,
                category: category.name
            })
            return
        }
        if (category.name === '攻擊機') {
            vehicles.push({
                id: '攻擊機',
                name: '攻擊機',
                kill: category.stats.values.kills || 0,
                destroyed: category.stats.values.destroyed || 0,
                time: Math.floor(+category.stats.values.seconds) || 0,
                category: category.name
            })
            return
        }
        if (category.name === '攻擊機') {
            vehicles.push({
                id: '攻擊機',
                name: '攻擊機',
                kill: category.stats.values.kills || 0,
                destroyed: category.stats.values.destroyed || 0,
                time: Math.floor(+category.stats.values.seconds) || 0,
                category: category.name
            })
            return
        }
        if (category.name === '轟炸機') {
            vehicles.push({
                id: '轟炸機',
                name: '轟炸機',
                kill: category.stats.values.kills || 0,
                destroyed: category.stats.values.destroyed || 0,
                time: Math.floor(+category.stats.values.seconds) || 0,
                category: category.name
            })
            return
        }
        if (category.name === '戰鬥機') {
            vehicles.push({
                id: '戰鬥機',
                name: '戰鬥機',
                kill: category.stats.values.kills || 0,
                destroyed: category.stats.values.destroyed || 0,
                time: Math.floor(+category.stats.values.seconds) || 0,
                category: category.name
            })
            return
        }
        category.vehicles.forEach(vehicle => {
            if (!vehicle.stats.values.kills) return
            vehicles.push({
                id: vehicle.guid,
                name: vehicle.name,
                kill: vehicle.stats.values.kills || 0,
                destroyed: vehicle.stats.values.destroyed || 0,
                time: Math.floor(+vehicle.stats.values.seconds) || 0,
                category: category.name
            })
        })
    })
    vehicles.sort((a, b) => b.kill - a.kill)
    const ground = [
        "重型坦克",
        "巡航坦克",
        "輕型坦克",
        "火砲裝甲車",
        "攻擊坦克",
        "突擊裝甲車",
        "定點武器",
        "馬匹",
        "Car",
        "A3ED808E-1525-412B-8E77-9EB6902A55D2",
        "BBFC5A91-B2FC-48D2-8913-658C08072E6E"
    ]
    const air = [
        "攻擊機",
        "轟炸機",
        "戰鬥機",
        "重型轟炸機",
        "飛船",
        "1A7DEECF-4F0E-E343-9644-D6D91DCAEC12"
    ]
    const sea = [
        "船隻",
        "驅逐艦",
        "003FCC0A-2758-8508-4774-78E66FA1B5E3"
    ]
    switch (category) {
        case '地面':
            vehicles = vehicles.filter(vehicle => (ground.includes(vehicle.category) || ground.includes(vehicle.id))).slice(0, 4)
            break
        case '空中':
            vehicles = vehicles.filter(vehicle => (air.includes(vehicle.category) || air.includes(vehicle.id))).slice(0, 4)
            break
        case '海洋':
            vehicles = vehicles.filter(vehicle => (sea.includes(vehicle.category) || sea.includes(vehicle.id))).slice(0, 4)
            break
        default:
            vehicles = vehicles.slice(0, 4)
            break
    }
    await quote(vehicles.map(vehicle =>
        `${sify(vehicle.name)}  ${Math.floor(vehicle.kill / 100)}★\n` +
        `击杀:${vehicle.kill}  摧毁载具:${vehicle.destroyed}\n`
        + `KPM:${(vehicle.time === 0) ? 0 : (vehicle.kill / vehicle.time * 60).toFixed(1)}  时间:${Math.floor(vehicle.time / 3600)}时${Math.floor(vehicle.time / 60) % 60}分`
    ).join('\n\n') || "数据不足")
}