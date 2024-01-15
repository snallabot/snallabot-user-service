import Koa from "koa"
import Router from "@koa/router"
import bodyParser from "@koa/bodyparser"
import { EA_LOGIN_URL, AUTH_SOURCE, CLIENT_SECRET, REDIRECT_URL, CLIENT_ID, VALID_ENTITLEMENTS } from "./constants"
import { AccountToken, TokenInfo, Entitlements, Personas } from "./ea_types"

const app = new Koa()
const router = new Router()


router.get("/login", (ctx) => {
    ctx.body = { url: EA_LOGIN_URL }
}).get("/retrievePersonas", async (ctx) => {
    const { code }: { code: string } = ctx.request.body
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
        new Error(`Failed to use login code: ${errorResponse}`)
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
        new Error(`Failed to retrieve account information: ${errorResponse}`)
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
        new Error(`Failed to retrieve madden entitlements: ${errorResponse}`)
    }
    const { entitlements: { entitlement: userEntitlements } } = (await pidUriResponse.json()) as Entitlements
    const validEntitlements = userEntitlements.filter(e => e.entitlementTag === "ONLINE_ACCESS" && Object.values(VALID_ENTITLEMENTS).includes(e.groupName))
    if (validEntitlements.length === 0) {
        throw new Error("User cannot access this version of Madden!")
    }
    // is this actually the right choice?
    const { pidUri, groupName: systemConsole } = validEntitlements[0]
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
        new Error(`Failed to retrieve madden persona accounts: ${errorResponse}`)
    }
    const { personas: { persona: userEaPersonas } } = (await personasResponse.json()) as Personas
    ctx.body = { personas: userEaPersonas, access_token, system_console: systemConsole }
})

app.use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods())

export default app