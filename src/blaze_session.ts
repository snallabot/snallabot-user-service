import getUserDB, { SessionId, SessionToken } from "./user_db"
import { CLIENT_ID, CLIENT_SECRET, AUTH_SOURCE, SERVICE_MAP, PRODUCT_MAP } from "./constants"
import { AccountToken, BlazeAuthResponse } from "./ea_types"
import { Agent } from "undici"
import crypto from "crypto"

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
    return await UserDB.updateSession(sessionId, refreshedAccountToken)
}

async function refreshBlazeSession(sessionId: SessionId): Promise<BlazeSessionInformation> {
    const lastSession = await UserDB.retrieveSession(sessionId)
    const lastBlazeSession = await UserDB.retrieveBlazeSession(sessionId)
    if (lastBlazeSession) {
    } else {
        return null
    }
}

async function createBlazeSession(lastSession: SessionToken): Promise<> {
    const { systemConsole } = await UserDB.retrievePersona(lastSession.personaId)
    const blazeAuthenticationResponse = await fetch(
        `https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login`,
        {
            // EA is on legacy SSL SMH LMAO ALSO
            dispatcher: new Agent({
                connect: {
                    rejectUnauthorized: false,
                    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
                },
            }),
            method: "POST",
            headers: {
                "Accept-Charset": "UTF-8",
                Accept: "application/json",
                "X-BLAZE-ID": SERVICE_MAP[systemConsole],
                "X-BLAZE-VOID-RESP": "XML",
                "X-Application-Key": "MADDEN-MCA",
                "Content-Type": "application/json",
                "User-Agent":
                    "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
            },
            body: JSON.stringify({
                accessToken: lastSession.access_token,
                productName: PRODUCT_MAP[systemConsole],
            }),
        },
    )
    if (!blazeAuthenticationResponse.ok) {
        //Todo throw error
    }
    const { userLoginInfo: { sessionKey, blazeId } } = (await blazeAuthenticationResponse.json() as BlazeAuthResponse)
    return await UserDB.saveBlazeSession(lastSession.sessionId, { sessionKey, blazeId })
}






interface BlazeSession {
    sendBlazeRequest(req: BlazeRequest): BlazeResponse
}
