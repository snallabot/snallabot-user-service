import { Persona } from "./ea_types"

type SessionToken = { access_token: string, refresh_token: string, expires_in: Date }

interface UserDB {
    savePersona(persona: Persona): void;
    retrievePersona(personaId: string): Persona;
    saveSession(sessionId: string, token: SessionToken): void;
    retrieveSession(sessionId: string): SessionToken;
}

export default {
    savePersona: function(persona: Persona) { },
    retrievePersona: function(personaId: string) { return ({} as Persona) },
    saveSession: function(sessionId: string, token: SessionToken) { },
    retrieveSession: function(sessionId: string) { return ({} as SessionToken) }
} as UserDB

