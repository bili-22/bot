import { searchPlayer, client } from "../lib/gateway.js";
import * as db from "../lib/db.js";
import { sify } from "chinese-conv";

export default async function ({ alias, aliases, sender, command, text, quote }) {
    try {
        if (command !== "bf1info.weapon") return
        const help =
            `${alias} [player]`
            + `\n${alias} [player] <突击兵|医疗兵|支援兵|侦察兵|精英兵>`
            + `\n${alias} [player] <冲锋枪|霰弹枪|轻机枪|半自动|步枪>`
            + `\n${alias} [player] <手枪|近战|配备|手榴弹|驾驶员>`
            + `\n可以使用[${aliases["bf1info.bind"][0]}]绑定账号`
        const params = text.split(/\s+/)
        if (params[1] && params[1].toLowerCase() === "help") {
            const fullHelp = help
                + `\n示例:`
                + `\n${alias} bilibili22`
                + `\n${alias} 突击兵`
                + `\n${alias} bilibili22 手枪`
            await quote(fullHelp)
            return
        }
        const categories = ['突击兵', '医疗兵', '支援兵', '侦察兵', '精英兵', '冲锋枪', '霰弹枪', '轻机枪', '半自动', '步枪', '手枪', '近战', '配备', '手榴弹', '驾驶员']
        let category = params.slice().pop()
        let persona
        const isCategory = category.match(/^[^\x00-\xff]+$/)
        if (isCategory ? params.length > 2 : params.length > 1) {
            persona = await searchPlayer({ name: isCategory ? text.replace(/^.*?\s+(.*?)\s+[^\s]*?$/, "$1") : text.replace(/^.*?\s+/, "") })
        } else {
            const result = await db.query(`SELECT personaId FROM bind_players WHERE qq = ${db.escape(sender)}`)
            if (!result[0]) {
                await quote(help)
                return
            }
            persona = await searchPlayer({ personaId: result[0].personaId })
        }
        if (isCategory && !categories.includes(category)) {
            await quote(`类别不存在`)
            return
        }
        if (!persona) {
            await quote(`玩家不存在`)
            return
        }

        const result = await client({ method: "Progression.getWeaponsByPersonaId", account: "default", params: { personaId: persona.personaId } })
        let weapons = []
        result.forEach(category => category.weapons.forEach(weapon => {
            if (!weapon.stats.values.kills) return
            weapons.push({
                id: weapon.guid,
                name: weapon.name,
                kill: weapon.stats.values.kills || 0,
                headshot: weapon.stats.values.headshots || 0,
                accuracy: weapon.stats.values.accuracy || 0,
                time: weapon.stats.values.seconds || 0,
                shot: weapon.stats.values.shots || 0,
                hit: weapon.stats.values.hits || 0,
                category: category.categoryId
            })
        }))
        let meleeKill = 0
        let meleeTime = 0
        let meleeShot = 0
        let meleeHit = 0
        weapons.filter(weapon => weapon.category === "ID_P_CAT_MELEE").forEach(weapon => meleeKill = meleeKill + weapon.kill || 0)
        weapons.filter(weapon => weapon.category === "ID_P_CAT_MELEE").forEach(weapon => meleeTime = meleeTime + weapon.time)
        weapons.filter(weapon => weapon.category === "ID_P_CAT_MELEE").forEach(weapon => meleeShot = meleeShot + weapon.shot)
        weapons.filter(weapon => weapon.category === "ID_P_CAT_MELEE").forEach(weapon => meleeHit = meleeHit + weapon.hit)
        if (meleeKill >= 2 * (weapons.filter(weapon => weapon.category === "ID_P_CAT_MELEE").sort((a, b) => b.kill - a.kill)[0] || { kill: 0 }).kill) {
            weapons.push({
                id: "MELEE",
                name: '近战武器（总）',
                kill: meleeKill || 0,
                headshot: 0,
                accuracy: 0,
                time: meleeTime || 0,
                shot: meleeShot || 0,
                hit: meleeHit || 0,
                category: "ID_P_CAT_MELEE"
            })
        }
        weapons.sort((a, b) => b.kill - a.kill)
        switch (category) {
            case '突击兵':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_SMG"
                    || weapon.category === "ID_P_CAT_SHOTGUN"
                    || weapon.id === "245A23B1-53BA-4AB2-A416-224794F15FCB" //1917
                    || weapon.id === "D8AEB334-58E2-4A52-83BA-F3C2107196F0" //费罗梅尔
                    || weapon.id === "7085A5B9-6A77-4766-83CD-3666DA3EDF28" //短管喷
                    || weapon.id === "079D8793-073C-4332-A959-19C74A9D2A46" //炸药
                    || weapon.id === "72CCBF3E-C0FE-4657-A1A7-EACDB2D11985" //反坦雷
                    || weapon.id === "6DFD1536-BBBB-4528-917A-7E2821FB4B6B" //地雷
                    || weapon.id === "BE041F1A-460B-4FD5-9E4B-F1C803C0F42F" //AT
                    || weapon.id === "AE96B513-1F05-4E63-A273-E98FA91EE4D0" //AA
                )
                break
            case '医疗兵':
                weapons = weapons.filter(weapon => (weapon.category === "ID_P_CAT_SEMI"
                    || weapon.id === "F34B3039-7B3A-0272-14E7-628980A60F06" //枪榴弹
                    || weapon.id === "03FDF635-8E98-4F74-A176-DB4960304DF5" //枪榴弹
                    || weapon.id === "165ED044-C2C5-43A1-BE04-8618FA5072D4" //枪榴弹
                    || weapon.id === "EBA4454E-EEB6-4AF1-9286-BD841E297ED4" //针
                    || weapon.id === "670F817E-89A6-4048-B8B2-D9997DD97982" //箱子
                    || weapon.id === "9BCDB1F5-5E1C-4C3E-824C-8C05CC0CE21A") //包
                    && weapon.id !== "245A23B1-53BA-4AB2-A416-224794F15FCB" //1917
                    && weapon.id !== "4E317627-F7F8-4014-BB22-B0ABEB7E9141" //卡尔卡诺（巡邏）
                )
                break
            case '支援兵':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_LMG"
                    || weapon.id === "0CC870E0-7AAE-44FE-B9D8-5D90706AF38B" //P08
                    || weapon.id === "6CB23E70-F191-4043-951A-B43D6D2CF4A2" //皮珀
                    || weapon.id === "3DC12572-2D2F-4439-95CA-8DFB80BA17F5" //M1911
                    || weapon.id === "2B421852-CFF9-41FF-B385-34580D5A9BF0" //Mle 1903
                    || weapon.id === "EBE043CB-8D37-4807-9260-E2DD7EFC4BD2" //C93
                    || weapon.id === "2B0EC5C1-81A5-424A-A181-29B1E9920DDA" //箱
                    || weapon.id === "19CB192F-1197-4EEB-A499-A2DA449BE811" //包
                    || weapon.id === "52B19C38-72C0-4E0F-B051-EF11103F6220" //包
                    || weapon.id === "C71A02C3-608E-42AA-9179-A4324A4D4539" //迫击炮
                    || weapon.id === "8BD0FABD-DCCE-4031-8156-B77866FCE1A0" //迫击炮
                    || weapon.id === "F59AA727-6618-4C1D-A5E2-007044CA3B89" //維修工具
                    || weapon.id === "95A5E9D8-E949-46C2-B5CA-36B3CA4C2E9D" //慈禧
                    || weapon.id === "60D24A79-BFD6-4C8F-B54F-D1AA6D2620DE" //十字弓
                    || weapon.id === "02D4481F-FBC3-4C57-AAAC-1B37DC92751E" //十字弓
                )
                break
            case '侦察兵':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_BOLT"
                    || weapon.id === "4E317627-F7F8-4014-BB22-B0ABEB7E9141" //卡尔卡诺（巡邏）
                    || weapon.id === "2543311A-B9BC-4F72-8E71-C9D32DCA9CFC" //信号
                    || weapon.id === "ADAD5F72-BD74-46EF-AB42-99F95D88DF8E" //信号
                    || weapon.id === "2D64B139-27C8-4EDB-AB14-734993A96008" //K
                    || weapon.id === "EF1C7B9B-8912-4298-8FCB-29CC75DD0E7F" //绊雷
                    || weapon.id === "9CF9EA1C-39A1-4365-85A1-3645B9621901" //绊雷
                    || weapon.id === "033299D1-A8E6-4A5A-8932-6F2091745A9D" //绊雷
                )
                break
            case '精英兵':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_FIELDKIT"
                    || weapon.id === "8A849EDD-AE9F-4F9D-B872-7728067E4E9F" //棒子
                )
                break
            case '冲锋枪':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_SMG")
                break
            case '霰弹枪':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_SHOTGUN")
                break
            case '轻机枪':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_LMG")
                break
            case '半自动':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_SEMI")
                break
            case '步枪':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_BOLT" || weapon.id === "BB20B711-EF98-4708-998A-D78780B8B8C4")
                break
            case '手枪':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_SIDEARM" && weapon.id !== "BB20B711-EF98-4708-998A-D78780B8B8C4")
                break
            case '近战':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_MELEE")
                break
            case '配备':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_GADGET")
                break
            case '手榴弹':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_GRENADE")
                break
            case '驾驶员':
                weapons = weapons.filter(weapon => weapon.category === "ID_P_CAT_VEHICLEKITWEAPON")
                break
            case 'all':
            default:
                weapons = weapons
                break
        }
        if (!weapons.find(weapon => weapon.kill > 0)) {
            await quote(`武器数据不足`)
            return
        }
        let full = weapons.slice(0, 10).map(weapon => {
            if (weapon.id === "4E40014C-B574-41A7-AF7C-8FE4556AC201") {
                return `${sify(weapon.name)}${weapon.name.match('）') ? '' : '  '}${Math.floor(weapon.kill / 100)}★\n` +
                    `击杀:${weapon.kill}  命中:${weapon.hit}`
            }
            if (weapon.category === "ID_P_CAT_MELEE") {
                return `${sify(weapon.name)}${weapon.name.match('）') ? '' : '  '}${Math.floor(weapon.kill / 100)}★\n` +
                    `击杀:${weapon.kill}  KPM:${(weapon.time === 0) ? 0 : (weapon.kill / weapon.time * 60).toFixed(2)}\n` +
                    `攻击:${weapon.shot}  命中:${weapon.hit}`
            }
            return `${sify(weapon.name)}${weapon.name.match('）') ? '' : '  '}${Math.floor(weapon.kill / 100)}★\n` +
                `击杀:${weapon.kill}  时间:${Math.floor(weapon.time / 3600)}时${Math.floor(weapon.time / 60) % 60}分\n` +
                `命中:${weapon.accuracy}%  爆头:${((weapon.headshot / weapon.kill) * 100).toFixed(1)}%\n` +
                `KPM:${(weapon.time === 0) ? 0 : (weapon.kill / weapon.time * 60).toFixed(2)}  效率:${(weapon.hit / weapon.kill).toFixed(2)}`
        })
        let thin = weapons.slice(0, 10).map(weapon => `${sify(weapon.name)}${weapon.name.match('）') ? '' : '  '}${Math.floor(weapon.kill / 100)}★`)
        await quote(full.slice(0, 3).concat(thin.slice(3, 7).join('\n')).join('\n\n') || "数据不足")
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
}