import { describe, expect, test, jest } from "@jest/globals";
import request from "supertest";
import app from "../app";

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

    })
})
