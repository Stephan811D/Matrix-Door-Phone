import session from 'express-session';
import MySQLStore from "express-mysql-session";

import { Request } from 'express';
import EnvironmentService from './environment.service';
import LoggerService from './logger.service';
import DatabaseService from './database.service';


declare module 'express-session' {
    interface SessionData {
        user: { sessionId: number };
        isAuthenticated: boolean;
    }
}

function loadSessionConfig() {
    const cookieTtlDays = EnvironmentService.authenticationVariables?.cookie?.ttlDays;
    const cookieSecret = EnvironmentService.authenticationVariables?.cookie?.secret;
    const https = EnvironmentService.serverVariables?.https;
    const sessionStoreOptions = {
        clearExpired: true,
        createDatabaseTable: false,
        schema: {
            tableName: 'cookie_sessions',
            columnNames: {
                session_id: 'id',
                expires: 'expires_at'
            }
        }
    };
    const databasePool = DatabaseService.sqlPool;

    //@ts-ignore
    const sessionStore = new (MySQLStore(session))(sessionStoreOptions, databasePool);

    if (!cookieTtlDays) {
        throw new Error("COOKIE_TTL_DAYS not set.");
    }

    if (!cookieSecret) {
        throw new Error("COOKIE_SECRET not set.");
    }

    if (!sessionStore) {
        throw new Error("session store not defined.");
    }

    return session({
        secret: cookieSecret,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: cookieTtlDays * 24 * 60 * 60 * 1000,
            secure: https,
            httpOnly: true,
            sameSite: https ? true : 'lax'
        },
    });
}

class SessionServiceSingelton {
    private _loggerService: LoggerService;
    private static _instance: SessionServiceSingelton;

    constructor() {
        this._loggerService = new LoggerService("Session-service", "#000", "#e4f046", true);
        this._loggerService.log("Service initialized")
    }

    setSessionData(req: Request, sessionId: number) {
        if (req.session) {
            this._loggerService.log("Cookie session created")
            req.session.user = { sessionId: sessionId };
            req.session.isAuthenticated = true;
        }
        else {
            this._loggerService.error("Could not create session");
            throw Error("Could not create session")
        }
    }

    public static getInstance(): SessionServiceSingelton {
        if (!SessionServiceSingelton._instance) {
            SessionServiceSingelton._instance = new SessionServiceSingelton();
        }
        return SessionServiceSingelton._instance;
    }
}

const SessionService = SessionServiceSingelton.getInstance();

export { SessionService, loadSessionConfig };