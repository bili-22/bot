import { client } from "../lib/gateway.js";
import { sify } from "chinese-conv";

export default async function ({ command, quote }) {
    if (command !== "bf1info.campaign") return
    let result
    try {
        result = await client({ method: "CampaignOperations.getPlayerCampaignStatus", account: "default" })
    } catch (error) {
        if (error.name === "GatewayError") {
            await quote(error.message)
            return
        }
        throw error
    }
    let msgtext
    if (!result || !result.op1) {
        msgtext = '当前无行动,等经理上新吧'
    } else {
        let dailyResetTime = new Date(new Date().getTime() + result.minutesToDailyReset * 60000)
        let endTime = new Date(new Date().getTime() + result.minutesRemaining * 60000)
        msgtext = `${sify(result.op1.name)} ${sify(result.op2.name)}\n行动箱进度${dailyResetTime.getHours().toString().padStart(2, '0')}:${dailyResetTime.getMinutes().toString().padStart(2, '0')}重置\n行动于${endTime.getFullYear().toString().slice(2, 4)}/${(endTime.getMonth() + 1).toString().padStart(2, '0')}/${endTime.getDate().toString().padStart(2, '0')} ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}结束`
    }
    await quote(msgtext)
}