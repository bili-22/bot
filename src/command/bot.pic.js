import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export default async function ({ Core, type, quote, group, data, __dirname }) {
    if (type !== 'GroupMessage') return
    if (!data.messageChain[1] || data.messageChain[1].type !== "At") return
    if (!Core.GroupFlag[group] || !Core.GroupFlag[group].includes("bot.pic")) return
    if (!(data.messageChain[1].target in Core.bots)) return
    if (data.messageChain[2] && (data.messageChain[2].type !== "Plain" || data.messageChain[1].text !== " ")) return
    const imgList = readdirSync(join(__dirname, "data/Image"))
    if (!imgList.length) {
        await quote(`图片文件夹为空`)
        return
    }
    const img = readFileSync(join(__dirname, "data/Image/", imgList[Math.floor(Math.random() * imgList.length)]))
    await Core.sendGroupMessage(group, img, Core.bots[data.messageChain[1].target])
}