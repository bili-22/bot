import { client, checkPerm, updateServerInfo } from "../lib/gateway.js";

const mapPrettyName = { "MP_Amiens": "亚眠", "MP_ItalianCoast": "帝国边境", "MP_ShovelTown": "攻占托尔", "MP_MountainFort": "格拉巴山", "MP_Graveyard": "决裂", "MP_FaoFortress": "法欧堡", "MP_Chateau": "流血宴厅", "MP_Scar": "圣康坦的伤痕", "MP_Suez": "苏伊士", "MP_Desert": "西奈沙漠", "MP_Forest": "阿尔贡森林", "MP_Giant": "庞然暗影", "MP_Verdun": "凡尔登高地", "MP_Trench": "尼维尔之夜", "MP_Underworld": "法乌克斯要塞", "MP_Fields": "苏瓦松", "MP_Valley": "加利西亚", "MP_Bridge": "勃鲁西洛夫关口", "MP_Tsaritsyn": "察里津", "MP_Ravines": "武普库夫山口", "MP_Volga": "窝瓦河", "MP_Islands": "阿尔比恩", "MP_Beachhead": "海丽丝岬", "MP_Harbor": "泽布吕赫", "MP_Ridge": "阿奇巴巴", "MP_River": "卡波雷托", "MP_Hell": "帕斯尚尔", "MP_Offensive": "索姆河", "MP_Naval": "黑尔戈兰湾", "MP_Blitz": "伦敦的呼唤：夜袭", "MP_London": "伦敦的呼唤：灾祸", "MP_Alps": "剃刀边缘" }
const modePrettyName = { "BreakthroughLarge": "行动模式", "Breakthrough": "闪击行动", "Conquest": "征服", "TugOfWar": "前线", "TeamDeathMatch": "团队死斗", "Possession": "战争信鸽", "Domination": "抢攻", "Rush": "突袭", "ZoneControl": "空降补给", "AirAssault": "空中突击" }
const mapNames = [["MP_Amiens", "亚眠", "亞眠", "压眠", "亚棉"], ["MP_ItalianCoast", "帝国边境", "帝國邊境"], ["MP_ShovelTown", "攻占托尔", "攻佔托爾"], ["MP_MountainFort", "格拉巴山", "格拉巴山", "拉粑粑山", "铜墙铁壁"], ["MP_Graveyard", "决裂", "決裂"], ["MP_FaoFortress", "法欧堡", "法歐堡", "重轰堡", "石油帝国"], ["MP_Chateau", "流血宴厅", "流血宴廳", "征服地狱", "流血餐厅", "流血食堂", "流血饭店"], ["MP_Scar", "圣康坦的伤痕", "聖康坦的傷痕", "圣嘉然的伤痕", "皇帝会战"], ["MP_Suez", "苏伊士", "蘇伊士", "苏14"], ["MP_Desert", "西奈沙漠", "西奈沙漠"], ["MP_Forest", "阿尔贡森林", "阿爾貢森林"], ["MP_Giant", "庞然暗影", "龐然闇影"], ["MP_Verdun", "凡尔登高地", "凡爾登高地", "老逼登高地", "老逼灯高地", "恶魔熔炉", "薯条熔炉"], ["MP_Trench", "尼维尔之夜", "尼維爾之夜", "尼哥之夜"], ["MP_Underworld", "法乌克斯要塞", "法烏克斯要塞", "垃圾场"], ["MP_Fields", "苏瓦松", "蘇瓦松", "跨越马恩"], ["MP_Valley", "加利西亚", "加利西亞", "狙利西亚", "勃鲁西洛夫攻势"], ["MP_Bridge", "勃鲁西洛夫关口", "勃魯西洛夫關口"], ["MP_Tsaritsyn", "察里津", "察里津", "查理津"], ["MP_Ravines", "武普库夫山口", "武普庫夫山口"], ["MP_Volga", "窝瓦河", "窩瓦河", "窝窝头河", "赤潮"], ["MP_Islands", "阿尔比恩", "阿爾比恩"], ["MP_Beachhead", "海丽丝岬", "海麗絲岬", "海丽丝峡", "加里波利"], ["MP_Harbor", "泽布吕赫", "澤布呂赫", "泽港"], ["MP_Ridge", "阿奇巴巴", "阿奇巴巴", "2788"], ["MP_River", "卡波雷托", "卡波雷托"], ["MP_Hell", "帕斯尚尔", "帕斯尚爾"], ["MP_Offensive", "索姆河", "索姆河"], ["MP_Naval", "黑尔戈兰湾", "黑爾戈蘭灣", "黑湾"], ["MP_Blitz", "伦敦的呼唤：夜袭", "倫敦的呼喚：夜襲", "空战"], ["MP_London", "伦敦的呼唤：灾祸", "倫敦的呼喚：災禍", "空战"], ["MP_Alps", "剃刀边缘", "剃刀邊緣", "空战"]]
const gameModes = [["BreakthroughLarge", "行動模式", "行动模式"], ["Breakthrough", "閃擊行動", "闪击行动"], ["Conquest", "征服", "征服"], ["TugOfWar", "前線", "前线"], ["TeamDeathMatch", "團隊死鬥", "团队死斗"], ["Possession", "戰爭信鴿", "战争信鸽", "鸽子"], ["Domination", "搶攻", "抢攻", "占点"], ["Rush", "突襲", "突袭"], ["ZoneControl", "空降補給", "空降补给", "空投"], ["AirAssault", "空中突擊", "空中突击", "空战"]]

export default async function ({ alias, command, sender, group, text, quote }) {
    if (command !== "bf1rsp.map") return
    const help = `${alias} <server> <map> [mode]\n服务器有多种模式时才需要写明模式`
    const params = text.toLowerCase().split(/\s+/)
    if (params[1] === "help") {
        const fullHelp = help
            + `\n示例:`
            + `\n${alias} 1 宴厅`
        await quote(fullHelp)
        return
    }
    if (!params[1] || !params[2]) {
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
    const { account, guid, gameId } = perm
    updateServerInfo({ guid }).catch()
    const rotation = JSON.parse(perm.rotation)

    const mapId = params[2]
    const modeId = params[3]

    let mapList = {}
    let modeList = []
    try {
        rotation.forEach((map, index) => {
            const mapImage = map.mapImage.split("/").pop()
            const mapName = mapImage.split("_")[0] + '_' + mapImage.split("_")[1]
            const gameMode = gameModes.find(gameModeNames => gameModeNames.includes(map.modePrettyName))[0]
            if (!modeList.includes(gameMode)) modeList.push(gameMode)
            if (!Object.keys(mapList).includes(mapName)) mapList[mapName] = {}
            if (!Object.keys(mapList[mapName]).includes(gameMode)) mapList[mapName][gameMode] = index
        })
        if (Math.floor(mapId) == mapId && mapId >= 0 && mapId < rotation.length) {
            await client({ method: "RSP.chooseLevel", account, params: { persistedGameId: guid, levelIndex: +mapId } })
            await quote('地图由 ' + fullServerDetail.serverInfo.mapNamePretty + ' 更换至 ' + rotation[+mapId].mapPrettyName)
            return
        }
        if (mapId == '重开') {
            const fullServerDetail = await client({ method: "GameServer.getFullServerDetails", account, params: { gameId } })
            await client({ method: "RSP.chooseLevel", account, params: { persistedGameId: guid, levelIndex: mapList[fullServerDetail.serverInfo.mapName][fullServerDetail.serverInfo.mapMode] } })
            await quote('已重开')
            return
        }

        let matchMaps = mapNames.filter(mapAliases => {
            for (let mapAlias of mapAliases) {
                if (mapAlias.indexOf(mapId) != -1 && Object.keys(mapList).includes(mapAliases[0]))
                    return true
            }
        }).map(item => item[0])

        if (matchMaps.length == 0) {
            await quote(`没有地图叫${mapId}`)
            return
        }
        if (matchMaps.length > 1) {
            await quote("匹配的地图过多")
            return
        }
        let mapToChange = matchMaps[0]
        if (Object.keys(mapList[mapToChange]).length == 1) {
            await client({ method: "RSP.chooseLevel", account, params: { persistedGameId: guid, levelIndex: mapList[mapToChange][Object.keys(mapList[mapToChange])[0]] } })
            if (modeList.length > 1) {
                await quote('地图更换至 ' + mapPrettyName[mapToChange] + '-' + modePrettyName[Object.keys(mapList[mapToChange])[0]])
                return
            }
            await quote('地图更换至 ' + mapPrettyName[mapToChange])
            return
        }
        if (!modeId) {
            await quote("该地图有多种模式")
            return
        }
        let matchModes = gameModes.filter(modeAliases => { for (let modeAlias of modeAliases) { if (modeAlias.indexOf(modeId) != -1 && Object.keys(mapList[mapToChange]).includes(modeAliases[0])) return true } }).map(item => item[0])
        if (matchModes.length == 0) {
            await quote("无匹配的模式")
            return
        }
        if (matchModes.length > 1) {
            await quote("匹配的模式过多")
            return
        }
        await client({ method: "RSP.chooseLevel", account, params: { persistedGameId: guid, levelIndex: mapList[mapToChange][matchModes[0]] } })
        await quote('地图更换至 ' + mapPrettyName[mapToChange] + '-' + modePrettyName[matchModes[0]])
        return
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
}