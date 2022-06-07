import { client } from "../lib/gateway.js";
import { sify } from "chinese-conv";

let time = 0
let exchange

export default async function ({ command, quote }) {
    if (command !== "bf1info.exchange") return
    let exchangeList = []
    let msg = []
    let result
    try {
        if (new Date().getTime() - time >= 60000) {
            result = await client({ method: "ScrapExchange.getOffers", account: "default" })
            exchange = result
            time = new Date().getTime()
        } else {
            result = exchange
        }
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
    for (let i in result.items) {
        if (!exchangeList.includes(result.items[i].item.parentName) && !!result.items[i].item.parentName) {
            exchangeList.push(result.items[i].item.parentName)
            msg.push(sify(result.items[i].item.parentName))
        }
        if (!exchangeList.includes(result.items[i].item.parentName) && !result.items[i].item.parentName) {
            if (result.items[i].item.category == 'ID_P_CAT_XPBOOST') continue
            msg.push(sify(result.items[i].item.name))
        }
    }
    await quote(msg.join("\n"))
}