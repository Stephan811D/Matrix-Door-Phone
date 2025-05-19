export interface MagicLinkRequestPayload {
    deviceId: string
}

export interface MagicLinkResponsePayload {
    verificationNumber: number,
    ttl_min: number,
    session: string
}