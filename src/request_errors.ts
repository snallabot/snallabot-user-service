export class EAAccountError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "EAAccountError"
    }
}

export class UserDBError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "UserDBError"
    }
}

export class InvalidRequestError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "InvalidRequestError"
    }
}
