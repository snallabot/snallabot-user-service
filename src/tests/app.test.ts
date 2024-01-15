import { describe, expect, test, jest } from "@jest/globals"
import request from "supertest"
import app from "../app"

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

describe("GET /retrievePersonas", () => {
    test("it should return correct personas", async () => {
        jest.spyOn(global, "fetch").mockImplementation((url: any) => {
            const mockResponse = (value: any) => (Promise.resolve({ ok: true, status: 200, json: async () => value } as Response))
            if (url === "https://accounts.ea.com/connect/token") {
                return mockResponse({ access_token: "access_token_123" })
            } else if (url === "https://accounts.ea.com/connect/tokeninfo?access_token=access_token_123") {
                return mockResponse({ pid_id: "pid1234" })
            } else if (url === "https://gateway.ea.com/proxy/identity/pids/pid1234/entitlements/?status=ACTIVE") {
                return mockResponse({ entitlements: { entitlement: [{ entitlementTag: "ONLINE_ACCESS", groupName: "MADDEN_24PS5", pidUri: "/pid1234" }, { entitlementTag: "BETA_ONLINE_ACCESS", groupName: "MADDEN_24PS5", pidUri: "/pid1234beta" }, { entitlementTag: "ONLINE_ACCESS", groupName: "MADDEN_22PS5", pidUri: "/pid1234m22" }] } })
            } else if (url === "https://gateway.ea.com/proxy/identity/pid1234/personas?status=ACTIVE&access_token=access_token_123") {
                return mockResponse({
                    personas: {
                        persona: [{ name: "testName1", namespaceName: "cem_ea_id" },
                        { name: "testName2", namespaceName: "ps3" }
                        ]
                    }
                })
            }
            throw new Error("fetch not mocked")
        })
        return request(app.callback())
            .post("/retrievePersonas")
            .send({ code: "code1234" })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200)
            .then(({ body }) => {
                expect(body.access_token).toBe("access_token_123")
                expect(body.system_console).toBe("MADDEN_24PS5")
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
