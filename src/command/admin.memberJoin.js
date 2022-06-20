import { memberJoinRequestList } from "../eventhandler/memberJoin.js";
export default async function ({ text, quote, quoteId, botPermLevel }) {
    if (!quote || !memberJoinRequestList[quoteId]) return
    if (!text) return
    if (botPermLevel < 1) {
        await quote(`你不是本群的管理员`)
        return
    }
    switch (text.replace(/\[\[@(.*?)\]\] ?/g, "").toLowerCase()) {
        case "y":
            memberJoinRequestList[quoteId].agree()
            delete memberJoinRequestList[quoteId]
            await quote(`已同意`)
            return
        case "n":
            memberJoinRequestList[quoteId].refuse()
            delete memberJoinRequestList[quoteId]
            await quote(`已拒绝`)
            return
        default:
            memberJoinRequestList[quoteId].refuse(text)
            delete memberJoinRequestList[quoteId]
            await quote(`已拒绝`)
            return
    }
}