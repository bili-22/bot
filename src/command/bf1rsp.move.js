import { client, checkPerm, searchPlayer } from "../lib/gateway.js";

const countries = {
    England: ["大英帝国", "英国", "带英帝国"],
    Germany: ["德意志帝国", "德国"],
    Austro: ["奥匈帝国"],
    Italy: ["意大利王国"],
    France: ["法兰西共和国", "法国", "法棍"],
    Ottoman: ["奥斯曼帝国", "鄂图曼帝国", "土鸡"],
    America: ["美利坚合众国", "美国", "漂亮国"]
}
const teamNames = [
    ["MP_Amiens", countries.England, countries.Germany],
    ["MP_ItalianCoast", countries.Austro, countries.Italy],
    ["MP_ShovelTown", countries.France, countries.Germany],
    ["MP_MountainFort", countries.Austro, countries.Italy],
    ["MP_Graveyard", countries.Germany, countries.France],
    ["MP_FaoFortress", countries.Ottoman, countries.England],
    ["MP_Chateau", countries.Germany, countries.America],
    ["MP_Scar", countries.England, countries.Germany],
    ["MP_Suez", countries.Ottoman, countries.England],
    ["MP_Desert", countries.Ottoman, countries.England],
    ["MP_Forest", countries.Germany, countries.America],
    ["MP_Giant", countries.England, countries.Germany],
    ["MP_Verdun", countries.France, countries.Germany],
    ["MP_Trench", countries.France, countries.Germany],
    ["MP_Underworld", countries.France, countries.Germany],
    ["MP_Fields", countries.Germany, countries.France],
    ["MP_Valley", countries.Austro, ["俄罗斯帝国"]],
    ["MP_Bridge", countries.Austro, ["俄罗斯帝国"]],
    ["MP_Tsaritsyn", ["白军"], ["红军"]],
    ["MP_Ravines", ["俄罗斯帝国"], countries.Austro],
    ["MP_Volga", ["白军"], ["红军"]],
    ["MP_Islands", ["俄罗斯帝国"], countries.Germany],
    ["MP_Beachhead", countries.Ottoman, countries.England],
    ["MP_Harbor", countries.Germany, [...countries.England, "皇家海军陆战队", "皇家马润", "皇军"]],
    ["MP_Ridge", countries.Ottoman, countries.England],
    ["MP_River", countries.Italy, countries.Austro],
    ["MP_Hell", countries.Germany, countries.England],
    ["MP_Offensive", countries.Germany, countries.England],
    ["MP_Naval", countries.Germany, [...countries.England, "皇家海军陆战队", "皇家马润", "皇军"]],
    ["MP_Blitz", countries.England, countries.Germany],
    ["MP_London", countries.England, countries.Germany],
    ["MP_Alps", countries.England, countries.Germany]
]

export default async function ({ alias, command, sender, group, text, quote }) {
    if (command !== "bf1rsp.move") return
    const help = `${alias} <server> <player> <camp>`
    const params = text.toLowerCase().split(/\s+/)
    if (params[1] === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} 1 bilibili22 德国`
            + `\n${alias} 1 bilibili22 防守方`
            + `\n${alias} 1 bilibili22 1`
        await quote(fullHelp)
        return
    }
    if (!params[1] || !params[2] || !params[3]) {
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
    const persona = await searchPlayer({ name: params[2] })
    if (!persona) {
        await quote(`玩家不存在`)
        return
    }
    const teamName = params[3]
    let teamId
    if (teamName == 1 || teamName == 2) {
        teamId = teamName
    } else if ('进攻方'.match(teamName)) {
        teamId = 2
    } else if ('防守方'.match(teamName)) {
        teamId = 1
    } else {
        const result = await client({ method: "GameServer.getServerDetails", account: account, params: { gameId } })
        const teamInfo = teamNames.find(map => { if (map[0] === result.mapName) return true })
        const team1 = teamInfo[1].find(name => name.match(teamName))
        const team2 = teamInfo[2].find(name => name.match(teamName))
        if (team1 && team2) {
            await quote(`匹配的阵营过多`)
            return
        } else if (team1) {
            teamId = 1
        } else if (team2) {
            teamId = 2
        } else {
            await quote(`未匹配到阵营`)
            return
        }
    }
    try {
        await client({ method: "RSP.movePlayer", account: account, params: { gameId, personaId: persona.personaId, teamId } })
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
    await quote(`已将${persona.name}移动到${params[1]}的队伍${teamId}`)
}