import Koa from "koa"
import Router from "@koa/router"
import bodyParser from "@koa/bodyparser"
import { EA_LOGIN_URL, AUTH_SOURCE, CLIENT_SECRET, REDIRECT_URL, CLIENT_ID, VALID_ENTITLEMENTS, ENTITLEMENT_TO_SYSTEM, MACHINE_KEY } from "./constants"
import { AccountToken, TokenInfo, Entitlements, Personas, Persona, SystemConsole } from "./ea_types"
import { EAAccountError, InvalidRequestError, UserDBError } from "./request_errors"
import getUserDB from "./user_db"

const app = new Koa()
const router = new Router()
const UserDB = getUserDB()

type RetrievePersonasRequest = { code: string }
type LinkPersona = { persona: Persona, access_token: string, system_console: SystemConsole }
type RetrievePersonaInformationRequest = { persona_id: number | undefined, session_id: string | undefined }

router.get("/login", (ctx) => {
    ctx.body = { url: EA_LOGIN_URL }
}).post("/retrievePersonas", async (ctx, next) => {
    const { code } = ctx.request.body as RetrievePersonasRequest
    const response = await fetch("https://accounts.ea.com/connect/token", {
        method: "POST",
        headers: {
            "Accept-Charset": "UTF-8",
            "User-Agent":
                "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept-Encoding": "gzip",
        },
        body: `authentication_source=${AUTH_SOURCE}&client_secret=${CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URL}&release_type=prod&client_id=${CLIENT_ID}`
    })
    if (!response.ok) {
        const errorResponse = await response.text()
        throw new EAAccountError(`Failed to use login code: ${errorResponse}`)
    }
    const { access_token } = (await response.json()) as AccountToken

    const pidResponse = await fetch(
        `https://accounts.ea.com/connect/tokeninfo?access_token=${access_token}`,
        {
            headers: {
                "Accept-Charset": "UTF-8",
                "X-Include-Deviceid": "true",
                "User-Agent":
                    "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                "Accept-Encoding": "gzip",
            },
        }
    )
    if (!pidResponse.ok) {
        const errorResponse = await response.text()
        throw new EAAccountError(`Failed to retrieve account information: ${errorResponse}`)
    }
    const { pid_id: pid } = (await pidResponse.json()) as TokenInfo
    const pidUriResponse = await fetch(
        `https://gateway.ea.com/proxy/identity/pids/${pid}/entitlements/?status=ACTIVE`,
        {
            headers: {
                "User-Agent":
                    "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                "Accept-Charset": "UFT-8",
                "X-Expand-Results": "true",
                "Accept-Encoding": "gzip",
                Authorization: `Bearer ${access_token}`,
            },
        }
    )
    if (!pidUriResponse.ok) {
        const errorResponse = await response.text()
        throw new EAAccountError(`Failed to retrieve madden entitlements: ${errorResponse}`)
    }
    const { entitlements: { entitlement: userEntitlements } } = (await pidUriResponse.json()) as Entitlements
    const validEntitlements = userEntitlements.filter(e => e.entitlementTag === "ONLINE_ACCESS" && Object.values(VALID_ENTITLEMENTS).includes(e.groupName))
    if (validEntitlements.length === 0) {
        throw new EAAccountError("User cannot access this version of Madden!")
    }
    // is this actually the right choice?
    const { pidUri, groupName: maddenEntitlement } = validEntitlements[0]
    const personasResponse = await fetch(
        `https://gateway.ea.com/proxy/identity${pidUri}/personas?status=ACTIVE&access_token=${access_token}`,
        {
            headers: {
                "Acccept-Charset": "UTF-8",
                "X-Expand-Results": "true",
                "User-Agent":
                    "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                "Accept-Encoding": "gzip",
            },
        }
    )
    if (!personasResponse.ok) {
        const errorResponse = await response.text()
        throw new EAAccountError(`Failed to retrieve madden persona accounts: ${errorResponse}`)
    }
    const { personas: { persona: userEaPersonas } } = (await personasResponse.json()) as Personas
    ctx.body = { personas: userEaPersonas, access_token, system_console: ENTITLEMENT_TO_SYSTEM[maddenEntitlement] }
    await next()
}).post("/createPersonaSession", async (ctx, next) => {
    const { persona, access_token, system_console } = ctx.request.body as LinkPersona

    const locationUrlResponse = await fetch(`https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}&machineProfileKey=${MACHINE_KEY}&authentication_source=${AUTH_SOURCE}&access_token=${access_token}&persona_id=${persona.personaId}&persona_namespace=${persona.namespaceName}`, {
        redirect: "manual", // this fetch resolves to localhost address with a code as a query string. if we follow the redirect, it won't be able to connect. Just take the location from the manual redirect
        headers: {
            "Upgrade-Insecure-Requests": "1",
            "User-Agent":
                "Mozilla/5.0 (Linux; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.71 Mobile Safari/537.36",
            Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "X-Requested-With": "com.ea.gp.madden19companionapp",
            "Sec-Fetc-Site": "none",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "en-US,en;q=0,9",
        }
    })

    const locationUrl = locationUrlResponse.headers.get("Location")
    if (!locationUrl) {
        throw new EAAccountError("Tried to retrieve location of access token but failed!")
    }

    const eaCode = new URLSearchParams(locationUrl.replace(REDIRECT_URL, "")).get("code")
    if (!eaCode) {
        console.error(`Could not retrieve code from ${locationUrl}`)
        throw new EAAccountError("Tried to retrieve new access token but failed!")
    }
    const newAccessTokenResponse = await fetch(`https://accounts.ea.com/connect/token`, {
        method: "POST",
        headers: {
            "Accept-Charset": "UTF-8",
            "User-Agent":
                "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept-Encoding": "gzip",
        },
        body: `authentication_source=${AUTH_SOURCE}&code=${eaCode}&grant_type=authorization_code&token_format=JWS&release_type=prod&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}`,
    })
    if (!newAccessTokenResponse.ok) {
        const errorResponse = await newAccessTokenResponse.text()

        throw new EAAccountError(`Failed to create access token: ${errorResponse}`)
    }
    const token = (await newAccessTokenResponse.json()) as AccountToken
    await UserDB.savePersona(persona, system_console)
    const sessionId = await UserDB.createSession(persona, token)
    ctx.body = {
        sessionId: sessionId,
        persona: persona
    }
    await next()
}).post("/retrievePersonaInformation", async (ctx, next) => {
    const retrievePersonaReq = ctx.request.body as RetrievePersonaInformationRequest
    let personaId;
    if (retrievePersonaReq.session_id) {
        const session = await UserDB.retrieveSession(retrievePersonaReq.session_id)
        personaId = session.personaId
    } else if (retrievePersonaReq.persona_id) {
        personaId = retrievePersonaReq.persona_id
    } else {
        throw new InvalidRequestError("Need to provide either session_id or persona_id")
    }
    const persona = await UserDB.retrievePersona(personaId)
    ctx.body = persona
    await next()
})

app.use(bodyParser({ enableTypes: ["json"], encoding: "utf-8" }))
    .use(async (ctx, next) => {
        try {
            await next()
        } catch (err: any) {
            if (err instanceof UserDBError || err instanceof InvalidRequestError) {
                ctx.status = 400;
                ctx.body = {
                    message: err.message
                }
            } else if (err instanceof EAAccountError) {
                console.error(err.message)
                ctx.status = 500
                ctx.body = {
                    message: `EA Error: ${err.message}`
                }
            }
            ctx.status = 500;
            ctx.body = {
                message: err.message
            };
        }
    })
    .use(router.routes())
    .use(router.allowedMethods())

export default app
