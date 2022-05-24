import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export default async function ({ Core, type, data, bot, __dirname }) {
    if (type !== 'GroupMessage') return
    if (!Core.GroupFlag[data.sender.group.id] || !Core.GroupFlag[data.sender.group.id].includes("bot.pic")) return
    if (!data.messageChain[1] || data.messageChain[1].type !== "At") return
    if (data.messageChain[2] && (data.messageChain[2].type !== "Plain" || data.messageChain[1].text !== " ")) return
    const imgList = readdirSync(join(__dirname, "data/Image"))
    const img = readFileSync(join(__dirname, "data/Image/", imgList[Math.floor(Math.random() * imgList.length)]))
    await bot.sendGroupMessage(data.sender.group.id, img)
}