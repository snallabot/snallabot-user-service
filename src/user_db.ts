import { Persona, AccountToken, SystemConsole } from "./ea_types"
import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { randomUUID } from "crypto"
import { UserDBError } from "./request_errors"

export type SessionToken = AccountToken & { created_date: Date, last_accessed: Date, personaId: number }
export type SavedPersona = Persona & { systemConsole: SystemConsole }
export type SessionId = string

interface UserDB {
    savePersona(persona: Persona, systemConsole: SystemConsole): Promise<void>;
    retrievePersona(personaId: number): Promise<SavedPersona>;
    createSession(persona: Persona, token: AccountToken): Promise<SessionId>;
    retrieveSession(sessionId: SessionId): Promise<SessionToken>;
}

function setupFirebase() {
    // production, use firebase with SA credentials passed from environment
    if (process.env.SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT)
        initializeApp({
            credential: cert(serviceAccount)
        })

    }
    // dev, use firebase emulator
    else {
        if (!process.env.FIRESTORE_EMULATOR_HOST) {
            throw new Error("Firestore emulator is not running!")
        }
        initializeApp({ projectId: "dev" })
    }
    return getFirestore()
}



const FirebaseUserDB: () => UserDB = () => {
    const db = setupFirebase()
    return {
        savePersona: async function(persona: Persona, systemConsole: SystemConsole) {
            const personaDoc = db.collection("personas").doc(`${persona.personaId}`)
            await personaDoc.set({ ...persona, systemConsole })
        },
        retrievePersona: async function(personaId: number) {
            const doc = await db.collection("personas").doc(`${personaId}`).get()
            const data = doc.data()
            if (!data) {
                throw new UserDBError(`Invalid Persona ${personaId}, missing from database. Is this user registered?`)
            }
            return doc.data() as SavedPersona
        },
        createSession: async function(persona: Persona, token: AccountToken) {
            const sessionId = randomUUID()
            const doc = db.collection("sessions").doc(sessionId)
            const session = { ...token, personaId: persona.personaId, created_date: new Date(), last_accessed: new Date() }
            await doc.set(session)
            return sessionId
        },
        retrieveSession: async function(sessionId: string) {
            const doc = await db.collection("sessions").doc(sessionId).get()
            const data = doc.data()
            if (!data) {
                throw new UserDBError(`Invalid Session ${sessionId}, missing from database. Create a new session id?`)
            }
            return doc.data() as SessionToken
        }
    }
}



export default FirebaseUserDB
