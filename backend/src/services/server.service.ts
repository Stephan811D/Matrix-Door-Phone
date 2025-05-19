import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';

import { fileURLToPath } from 'url';
import path from 'path';

import { CorsOptions } from 'cors';
import LoggerService from './logger.service';
import { getAbsolutePath } from "../utils/path.utils";

import EnvironmentService from "./environment.service";

class ServerServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: ServerServiceSingleton;

    private _keyPath: string | undefined;
    private _certPath: string | undefined;

    private _httpsServer: boolean | undefined = undefined;

    constructor() {
        this._loggerService = new LoggerService("Server-service", "#000", "#e4f046", true);
        this._loggerService.log("Service initialized");

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        this._keyPath = path.resolve(getAbsolutePath(__dirname, '../../'), 'certificate/key.pem');
        this._certPath = path.resolve(getAbsolutePath(__dirname, '../../'), 'certificate/cert.pem');
    }

    public createServer(app: express.Application) {
        this._httpsServer = EnvironmentService?.serverVariables?.https;

        if (this._httpsServer) {
            this._loggerService.log("Creating https-Server:")
            this._loggerService.log("Loading key from: " + this._keyPath);
            this._loggerService.log("Loading cert from: " + this._certPath);

            if (this._keyPath && this._certPath) {

                if (existsSync(this._keyPath) && existsSync(this._certPath)) {
                    const privateKey = readFileSync(this._keyPath, 'utf8');
                    const certificate = readFileSync(this._certPath, 'utf8');
                    const credentials = { key: privateKey, cert: certificate };
                    this._loggerService.log('Created HTTPS server');
                    return createHttpsServer(credentials, app);
                }
                else {
                    this._loggerService.error("Key or certificate file not found")
                }
            }
            else {
                this._loggerService.error("Could not create HTTPS server")
            }
        }

        this._loggerService.log('Created HTTP server');
        return createHttpServer(app);
    }

    public getCorsSettings(): CorsOptions {
        this._loggerService.log("Allowing CORS origins: " + EnvironmentService?.serverVariables?.allowedCorsOrigins.split(","))
        const corsOptions = {
            origin: EnvironmentService?.serverVariables?.allowedCorsOrigins.split(","),
            optionsSuccessStatus: 200,
            credentials: true
        };
        return corsOptions;
    }

    public static getInstance(): ServerServiceSingleton {
        if (!ServerServiceSingleton._instance) {
            ServerServiceSingleton._instance = new ServerServiceSingleton();
        }
        return ServerServiceSingleton._instance;
    }

    public get serverType(): string | undefined {
        return this._httpsServer ? "https" : "http";
    }
}

const ServerService = ServerServiceSingleton.getInstance();

export default ServerService;