
/*
  I want to document the response types from EA. Some of these should be more narrowly defined, but I do not know what all the enumerations are. I welcome in the future if we find more values that we change these to be narrower so we can safely rely on the values better
*/
export type AccountToken = { access_token: string; expires_in: number; id_token: null; refresh_token: string; token_type: "Bearer" }
export type TokenInfo = { client_id: "MaddenCompanionApp19"; expires_in: number; persona_id: null; pid_id: string; pid_type: "NUCLEUS"; scope: string; user_id: string }
export type Entitlement = { entitlementId: number; entitlementSource: string; entitlementTag: string; entitlementType: string; grantDate: string; groupName: string; isConsumable: boolean; lastModifiedDate: string; originPermissions: number; pidUri: string; productCatalog: string; productId: string; projectId: string; status: string; statusReasonCode: string; terminationDate: string; useCount: number; version: number }
export type Entitlements = { entitlements: { entitlement: Array<Entitlement> } }
export type Namespace = "xbox" | "ps3" | "cem_ea_id" | "stadia"
export type SystemConsole = "xone" | "xbsx" | "ps4" | "ps5" | "pc" | "stadia"
export type Persona = { dateCreated: string; displayName: string; isVisible: boolean; lastAuthenticated: string; name: string; namespaceName: Namespace; personaId: number; pidId: number; showPersona: string; status: string; statusReasonCode: string }
export type Personas = { personas: { persona: Array<Persona> } }


