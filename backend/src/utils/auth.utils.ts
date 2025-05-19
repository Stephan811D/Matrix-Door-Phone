import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { IMagicLinkTokenPayload } from "../interfaces/models/magic-link-payload.interface"

export function generateMagicLinkToken(payload: IMagicLinkTokenPayload | undefined, secret: string | undefined, ttl: number | undefined) {
    if (payload === undefined || secret === undefined || ttl === undefined) {
        throw new Error('Payload, secret or ttl is undefined.');
    }

    return jwt.sign(payload, secret, { expiresIn: `${ttl}m` });
}

export function verifyMagicLinkToken(token: string | undefined, secret: string | undefined): IMagicLinkTokenPayload {
    if (token === undefined || secret === undefined) {
        throw new Error('Token or secret is undefined.');
    }

    try {
        const verifiedPayload = jwt.verify(token, secret);

        if (typeof verifiedPayload === 'object' && verifiedPayload !== null) {
            if ('deviceId' in verifiedPayload && 'sessionId' in verifiedPayload && 'sixDigitNumber' in verifiedPayload) {
                return verifiedPayload as IMagicLinkTokenPayload;
            }
        }
        throw new Error('Invalid token payload.');
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token.');
        } else if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired.');
        } else {
            throw new Error('An unexpected error occurred during token verification.');
        }
    }
}

export function generateSixDigitNumber() {
    return Math.floor(100000 + Math.random() * 900000);
}

export function generateSessionId() {
    return uuidv4();
}