import { describe, expect, test, jest } from "@jest/globals"
import request from "supertest"
import app from "../app"

jest.mock("../user_db", () => ({
    __esModule: true,
    default: jest.fn(() => ({
        savePersona: jest.fn(),
        retrievePersona: jest.fn(),
        createSession: jest.fn().mockImplementation(() => "sessionId123"),
        retrieveSession: jest.fn()

    })),
}));

describe("GET /login", () => {
    test("It should return EA login url", async () => {
        return request(app.callback())
            .get("/login")
            .expect(200)
            .then(({ body }) => {
                expect(body.url).toBe(
                    "https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=http://127.0.0.1/success&client_id=MaddenCompanionApp19&machineProfileKey=MCA4b35d75Vm-MCA&authentication_source=317239",
                )
            })
    })
})

function mockFetch(mockedFetches: any) {
    const mockResponse = (value: any) => (Promise.resolve({ ok: true, status: 200, json: async () => value } as Response))
    jest.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (!mockedFetches[url]) {
            console.error("no mocked fetch found for " + url)
            throw new Error("fetch not mocked")
        }
        if (typeof mockedFetches[url] === "object") {
            return mockResponse(mockedFetches[url])
        } else if (typeof mockedFetches[url] === "function") {
            return mockedFetches[url]()
        }

        throw new Error("wrong typing for mock, must be function or object")
    })
}

describe("GET /retrievePersonas", () => {
    test("it should return correct personas", async () => {
        mockFetch(
            {
                "https://accounts.ea.com/connect/token": { access_token: "access_token_123" },
                "https://accounts.ea.com/connect/tokeninfo?access_token=access_token_123": { pid_id: "pid1234" },
                "https://gateway.ea.com/proxy/identity/pids/pid1234/entitlements/?status=ACTIVE": { entitlements: { entitlement: [{ entitlementTag: "ONLINE_ACCESS", groupName: "MADDEN_24PS5", pidUri: "/pid1234" }, { entitlementTag: "BETA_ONLINE_ACCESS", groupName: "MADDEN_24PS5", pidUri: "/pid1234beta" }, { entitlementTag: "ONLINE_ACCESS", groupName: "MADDEN_22PS5", pidUri: "/pid1234m22" }] } },
                "https://gateway.ea.com/proxy/identity/pid1234/personas?status=ACTIVE&access_token=access_token_123": {
                    personas: {
                        persona: [{ name: "testName1", namespaceName: "cem_ea_id" },
                        { name: "testName2", namespaceName: "ps3" }
                        ]
                    }
                }
            }
        )
        return request(app.callback())
            .post("/retrievePersonas")
            .send({ code: "code1234" })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200)
            .then(({ body }) => {
                expect(body.access_token).toBe("access_token_123")
                expect(body.system_console).toBe("ps5")
                expect(body.personas).toStrictEqual([{ name: "testName1", namespaceName: "cem_ea_id" },
                { name: "testName2", namespaceName: "ps3" }
                ])
            })
    })
    test("it should handle fetching code errors", async () => {
        // it would be ideal to test every fetch, in reality the first one will probably fail first 
        jest.spyOn(global, "fetch").mockImplementation((url: any) => {
            const mockResponse = (value: any) => (Promise.resolve({ ok: false, status: 500, json: async () => value } as Response))
            return mockResponse({ "error": "invalid_request", "error_description": "code is not issued to this environment", "code": 100119 })
        })
        return request(app.callback())
            .post("/retrievePersonas")
            .send({ code: "code1234" })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(500)
    })
})

describe("GET /createPersonaSession", () => {
    test("it should properly create persona session", async () => {
        mockFetch(
            {
                "https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=http://127.0.0.1/success&client_id=MaddenCompanionApp19&machineProfileKey=MCA4b35d75Vm-MCA&authentication_source=317239&access_token=access_token123&persona_id=persona123&persona_namespace=ps3": () => Promise.resolve({ ok: true, status: 302, headers: { get: (loc: string) => "http://127.0.0.1/success?code=eacode2" } } as Response),
                "https://accounts.ea.com/connect/token": { access_token: "access_token2_123", refresh_token: "refresh_token:123", expires_in: 5, id_token: null, token_type: "Bearer" },
            }
        )
        return request(app.callback())
            .post("/createPersonaSession")
            .send({ persona: { name: "testName2", namespaceName: "ps3", personaId: "persona123" }, access_token: "access_token123", system_console: "ps5" })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200)
            .then(({ body }) => {
                expect(body.sessionId).toBe("sessionId123")
                expect(body.persona).toStrictEqual({ name: "testName2", namespaceName: "ps3", personaId: "persona123" })
            })
    })
})
