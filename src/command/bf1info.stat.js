import { searchPlayer, client } from "../lib/gateway.js";
import * as db from "../lib/db.js";

const kitNormal = { "Scout": "侦察兵", "Assault": "突击兵", "Support": "支援兵", "Medic": "医疗兵", "Pilot": "飞行员", "Cavalry": "骑兵", "Tanker": "坦克兵" }
const modeName = { "Breakthrough": "行动模式", "Possession": "战争信鸽", "TeamDeathMatch": "团队死斗", "BreakthroughLarge": "行动模式", "TugOfWar": "前线", "Conquest": "征服", "Domination": "抢攻", "Rush": "突袭" }

export default async function ({ alias, aliases, sender, command, text, quote }) {
    if (command !== "bf1info.stat") return
    const help = `${alias} [player]\n可以使用[${aliases["bf1info.bind"][0]}]绑定账号`
    const name = text.split(/\s+/)[1] && text.replace(/^.*?\s+/, "") || null
    if (name && name.toLowerCase() === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias}`
            + `\n${alias} bilibili22`
        await quote(fullHelp)
        return
    }
    let persona, results
    if (!name) {
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
    } else {
        try {
            persona = await searchPlayer({ name })
        } catch (error) {
            if (error.name === "GatewayError") {
                await quote(error.message)
                return
            }
            throw error
        }
    }
    if (!persona) {
        await quote(`玩家不存在`)
        return
    }
    const reqs = [
        client({ method: "Stats.detailedStatsByPersonaId", account: "default", params: { personaId: persona.personaId } }),
        client({ method: "Progression.getWeaponsByPersonaId", account: "default", params: { personaId: persona.personaId } })
    ]
    try {
        results = await Promise.all(reqs)
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
    const stat = results[0]
    const weapons = []
    let meleeKill = 1
    let mortarKill = 1
    let smgKill = 1
    results[1].forEach(category => category.weapons.forEach(weapon => {
        if (!weapon.stats.values.kills) return
        if (category.categoryId === 'ID_P_CAT_MELEE') meleeKill = meleeKill + weapon.stats.values.kills
        if (weapon.guid === "C71A02C3-608E-42AA-9179-A4324A4D4539" || weapon.guid === "8BD0FABD-DCCE-4031-8156-B77866FCE1A0") mortarKill = mortarKill + weapon.stats.values.kills
        if (weapon.guid === "C4F8BC18-1908-4A83-ABB6-B812C05D49CE" || weapon.guid === "DEC97287-AF0B-49E4-8FD8-CBC5FB5AF497") smgKill = smgKill + weapon.stats.values.kills

        weapons.push({
            id: weapon.guid,
            name: weapon.name,
            kill: weapon.stats.values.kills,
            category: category.categoryId
        })
    }))
    weapons.push({
        id: 'melee',
        name: '近战击杀',
        kill: meleeKill,
        category: "ID_P_CAT_MELEE"
    })
    weapons.push({
        id: 'mortar',
        name: '迫击炮击杀',
        kill: mortarKill,
        category: "ID_P_CAT_GADGET"
    })
    weapons.push({
        id: 'smg',
        name: '轮椅击杀',
        kill: smgKill,
        category: "ID_P_CAT_SMG"
    })
    weapons.sort((a, b) => b.kill - a.kill)
    const eaid = persona.name
    let gameModeStats = stat.gameModeStats.sort((a, b) => b.score - a.score)
    let playerTitle = getTitle(stat, weapons)
    function getTitle(stat, weapons) {
        if (stat.basicStats.kpm > 5.2)
            return '自爆卡车'

        if (weapons.slice(0, 3).find(weapon => weapon.id === "4E40014C-B574-41A7-AF7C-8FE4556AC201") && weapons.find(weapon => weapon.id === "4E40014C-B574-41A7-AF7C-8FE4556AC201").kill >= 300)
            return `刺刀人 ${Math.floor(weapons.find(weapon => weapon.id === "4E40014C-B574-41A7-AF7C-8FE4556AC201").kill / 100)}★`

        if (weapons.slice(0, 3).find(weapon => weapon.id === "95A5E9D8-E949-46C2-B5CA-36B3CA4C2E9D") && weapons.find(weapon => weapon.id === "95A5E9D8-E949-46C2-B5CA-36B3CA4C2E9D").kill >= 150)
            return `磁爆步兵 ${Math.floor(weapons.find(weapon => weapon.id === "95A5E9D8-E949-46C2-B5CA-36B3CA4C2E9D").kill / 100)}★`

        if (weapons.slice(0, 4).find(weapon => weapon.id === "1B74E3E0-2484-3BF0-AF8F-25BFA008B6F0") && weapons.find(weapon => weapon.id === "1B74E3E0-2484-3BF0-AF8F-25BFA008B6F0").kill >= 100)
            return `⭐幽灵`

        if (weapons.slice(0, 3).find(weapon => weapon.id === "D4A1023A-6C3B-48DF-9515-C35A9463794D") && weapons.find(weapon => weapon.id === "D4A1023A-6C3B-48DF-9515-C35A9463794D").kill >= 300)
            return `🔥 ${Math.floor(weapons.find(weapon => weapon.id === "D4A1023A-6C3B-48DF-9515-C35A9463794D").kill / 100)}★`

        if (weapons.slice(0, 3).find(weapon => weapon.id === "8A849EDD-AE9F-4F9D-B872-7728067E4E9F") && weapons.find(weapon => weapon.id === "8A849EDD-AE9F-4F9D-B872-7728067E4E9F").kill >= 300)
            return `战壕骑兵 ${Math.floor(weapons.find(weapon => weapon.id === "8A849EDD-AE9F-4F9D-B872-7728067E4E9F").kill / 100)}★`

        if (weapons.slice(0, 3).find(weapon => weapon.id === "0B575357-B536-45FF-BC1B-386560AE2163") && weapons.find(weapon => weapon.id === "0B575357-B536-45FF-BC1B-386560AE2163").kill >= 300)
            return `机枪哨兵 ${Math.floor(weapons.find(weapon => weapon.id === "0B575357-B536-45FF-BC1B-386560AE2163").kill / 100)}★`

        if (weapons.slice(0, 3).find(weapon => weapon.id === "BCF1DDDF-C812-43E6-9F5A-F08109BAB746") && weapons.find(weapon => weapon.id === "BCF1DDDF-C812-43E6-9F5A-F08109BAB746").kill >= 300)
            return `冲锋枪哨兵 ${Math.floor(weapons.find(weapon => weapon.id === "BCF1DDDF-C812-43E6-9F5A-F08109BAB746").kill / 100)}★`

        if (weapons.slice(0, 3).find(weapon => weapon.id === "A9DBBCBD-E028-4EE9-8123-252B983D8CD6") && weapons.find(weapon => weapon.id === "A9DBBCBD-E028-4EE9-8123-252B983D8CD6").kill >= 300)
            return `坦克猎手 ${Math.floor(weapons.find(weapon => weapon.id === "A9DBBCBD-E028-4EE9-8123-252B983D8CD6").kill / 100)}★`

        if (weapons.slice(0, 2).find(weapon => weapon.id === "079D8793-073C-4332-A959-19C74A9D2A46") && weapons.find(weapon => weapon.id === "079D8793-073C-4332-A959-19C74A9D2A46").kill >= 300)
            return `炸弹人 ${Math.floor(weapons.find(weapon => weapon.id === "079D8793-073C-4332-A959-19C74A9D2A46").kill / 100)}★`

        if (weapons.slice(0, 2).find(weapon => weapon.id === "BE041F1A-460B-4FD5-9E4B-F1C803C0F42F") && weapons.find(weapon => weapon.id === "BE041F1A-460B-4FD5-9E4B-F1C803C0F42F").kill >= 400)
            return `火箭兵 ${Math.floor(weapons.find(weapon => weapon.id === "BE041F1A-460B-4FD5-9E4B-F1C803C0F42F").kill / 100)}★`

        if (weapons.slice(0, 2).find(weapon => weapon.id === "AE96B513-1F05-4E63-A273-E98FA91EE4D0") && weapons.find(weapon => weapon.id === "AE96B513-1F05-4E63-A273-E98FA91EE4D0").kill >= 400)
            return `AA人 ${Math.floor(weapons.find(weapon => weapon.id === "AE96B513-1F05-4E63-A273-E98FA91EE4D0").kill / 100)}★`

        if (weapons[0].id === "melee" && weapons[0].kill >= 300)
            return `剑圣 ${Math.floor(weapons[0].kill / 100)}★`

        switch (stat.kitStats.sort((a, b) => b.kills - a.kills)[0].name) {
            case 'Assault': {
                let kpm = stat.basicStats.kpm

                if (weapons[0].id === "smg" && weapons[0].kill >= 300)
                    return `轮椅人 ${Math.floor(weapons.find(weapon => weapon.id === "smg").kill / 100)}★`

                if (kpm > 2.2) return '⭐猎🐴人'
                if (kpm > 1) return '突击兵'
                return '土鸡兵'
                break
            }
            case 'Medic': {
                let kpm = stat.basicStats.kpm
                let rpm = stat.revives / stat.kitStats.find(kit => kit.name === 'Medic').secondsAs * 60
                let hpm = stat.heals / stat.kitStats.find(kit => kit.name === 'Medic').secondsAs * 60
                if (rpm > 0.5 && kpm > 2) return '⭐神医'
                if (rpm > 0.5) return '华佗'
                if (hpm > 2.5) return '双包庸医'
                if (kpm > 1.5) return '战地医疗兵'
                return '庸医'
                break
            }
            case 'Support': {
                let kpm = stat.basicStats.kpm
                let rpm = stat.repairs / stat.kitStats.find(kit => kit.name === 'Support').secondsAs * 60

                if (weapons[0].id === "96B134CC-5EDA-436A-9913-5ED429C696DD" && weapons[0].kill >= 300)
                    return `趴地人 ${Math.floor((weapons.find(weapon => weapon.id === "96B134CC-5EDA-436A-9913-5ED429C696DD").kill + weapons.find(weapon => weapon.id === "BE397913-E33F-40B2-87C4-F7B92426AAA1").kill) / 100)}★`

                if (weapons.slice(0, 2).find(weapon => weapon.id === "mortar") && weapons.find(weapon => weapon.id === "mortar").kill >= 300)
                    return `啊哈哈哈迫击炮来喽 ${Math.floor(weapons.find(weapon => weapon.id === "mortar").kill / 100)}★`

                if (rpm > 0.4) return '⭐焊舞帝'
                if (rpm > 0.2) return '维修工'
                if (kpm > 2.2) return '⭐支援兵'
                if (kpm > 2.0) return '支援兵+++++'
                if (kpm > 1.8) return '支援兵++++'
                if (kpm > 1.6) return '支援兵+++'
                if (kpm > 1.4) return '支援兵++'
                if (kpm > 1.2) return '支援兵+'
                if (kpm > 1.0) return '支援兵'
                return '炊事员'
                break
            }
            case 'Scout': {
                let kpm = stat.basicStats.kpm
                let kd = stat.kdr
                if (kpm > 2 && kd > 3) return '⭐狙击手'
                if (kpm > 2) return '神射手'
                if (kpm > 1) return '侦察兵'
                return '斟茶兵'
                break
            }
            case 'Cavalry': {
                return `🐴兵 ${Math.floor(
                    (
                        ((weapons.find(weapon => weapon.id === "CB3DE34F-3706-42BD-B7E6-00D54EA6B936") && weapons.find(weapon => weapon.id === "CB3DE34F-3706-42BD-B7E6-00D54EA6B936").kill) || 0)
                        + ((weapons.find(weapon => weapon.id === "A32A090F-16B9-4546-983A-43BE721BDA6B") && weapons.find(weapon => weapon.id === "A32A090F-16B9-4546-983A-43BE721BDA6B").kill) || 0)
                        + ((weapons.find(weapon => weapon.id === "4A960C79-5265-4559-B1D2-90E1B5BE7238") && weapons.find(weapon => weapon.id === "4A960C79-5265-4559-B1D2-90E1B5BE7238").kill) || 0)
                    )
                    / 100)}★`
                break
            }
            case 'Pilot': {
                let kpm = stat.basicStats.kpm
                if (kpm > 1.5) return '飞行员'
                return '伞兵'
                break
            }
            case 'Tanker': {
                let kpm = stat.basicStats.kpm
                if (kpm > 1.5) return '坦克兵'
                return '泥头车兵'
                break
            }
        }

        return kitNormal[stat.favoriteClass]
    }
    if (stat.basicStats.timePlayed < 1800) {
        await quote(`该玩家还没玩过BF1`)
        return
    }
    await quote(`玩家: ${eaid}`
        + `\n胜率: ${((stat.basicStats.wins / (stat.basicStats.wins + stat.basicStats.losses)) * 100).toFixed(2)}%(${stat.basicStats.wins}/${stat.basicStats.losses})`
        + `\nKD: ${stat.kdr}(${stat.basicStats.kills}/${stat.basicStats.deaths})`
        + `\nKPM: ${stat.basicStats.kpm}`
        + `\nSPM: ${stat.basicStats.spm}`
        + `\n命中率: ${(stat.accuracyRatio * 100).toFixed(2)}%`
        + `\n技巧值: ${stat.basicStats.skill}`
        + `\n最远爆头: ${stat.longestHeadShot}m`
        + `\n取得狗牌数: ${stat.dogtagsTaken}`
        + `\n最高连杀数: ${stat.highestKillStreak}`
        + `\n复仇击杀数: ${stat.avengerKills}`
        + `\n小队救星击杀数: ${stat.saviorKills}`
        + `\n克星击杀数: ${stat.nemesisKills}`
        + `\n最高克星连杀: ${stat.nemesisKillStreak}`
        + `\n占领旗帜数: ${stat.flagsCaptured}`
        + `\n防守旗帜数: ${stat.flagsDefended}`
        + `\n救援数: ${stat.revives}`
        + `\n治疗数: ${stat.heals}`
        + `\n修理数: ${stat.repairs}`
        // +`\n奖励分数: ${stat.awardScore}`
        // +`\n加成分数: ${stat.bonusScore}`
        // +`\n小队分数: ${stat.squadScore}`
        + `\n兵种称号: ${playerTitle}`
        + `\n最佳模式: ${modeName[gameModeStats[0].name]}`
        + `\n游戏时间: ${Math.floor(stat.basicStats.timePlayed / 3600)}小时`
    )
}