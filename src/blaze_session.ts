import getUserDB, { SessionId, SessionToken } from "./user_db"
import { CLIENT_ID, CLIENT_SECRET, AUTH_SOURCE } from "./constants"
import { AccountToken } from "./ea_types"

const UserDB = getUserDB()

type BlazeSessionInformation = { sessionKey: string, expiry: Date, blazeId: string, requestId: number }
type BlazeRequest = { apiRoute: string, body: any }
type BlazeResponse = any

async function refreshToken(sessionId: SessionId): Promise<SessionToken> {
    const lastSession = await UserDB.retrieveSession(sessionId)
    const currentTime = new Date()
    const expiredTime = new Date(lastSession.last_accessed.getTime() + lastSession.expires_in * 1000)
    if (currentTime < expiredTime) {
        return lastSession
    }
    const refreshResponse = await fetch(`https://accounts.ea.com/connect/token`, {
        method: "POST",
        headers: {
            "Accept-Charset": "UTF-8",
            "User-Agent":
                "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept-Encoding": "gzip",
        },
        body: `grant_type=refresh_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&release_type=prod&refresh_token=${lastSession.refresh_token}&authentication_source=${AUTH_SOURCE}&token_format=JWS`,
    })
    const refreshedAccountToken = (await refreshResponse.json()) as AccountToken
    const newSession = { ...lastSession, ...refreshedAccountToken }
    return newSession
}

async function refreshBlazeSession(sessionId: SessionId): Promise<BlazeSessionInformation> {

    return undefined
}






interface BlazeSession {
    sendBlazeRequest(req: BlazeRequest): BlazeResponse
}
