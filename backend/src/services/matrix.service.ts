import sdk, { MatrixClient } from "matrix-js-sdk";
import { logger as mxLogger } from 'matrix-js-sdk/lib/logger';

import LoggerService from './logger.service';
import EnvironmentService from "./environment.service";
import IAuthenticationVariables from '../interfaces/environment/authentication.interface'
import { IMatrixPlayload } from '../interfaces/models/matrix-payload.interface'

class MatrixServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: MatrixServiceSingleton;
    private _environment: IAuthenticationVariables | undefined;

    private _matrixClient: MatrixClient | undefined;

    constructor() {
        this._loggerService = new LoggerService("Matrix-Service", "#000", "#919191", true);
        this._environment = undefined;
        this._matrixClient = undefined;
    }

    public static getInstance(): MatrixServiceSingleton {
        if (!MatrixServiceSingleton._instance) {
            MatrixServiceSingleton._instance = new MatrixServiceSingleton();
        }
        return MatrixServiceSingleton._instance;
    }

    public initClient() {
        this._environment = EnvironmentService.authenticationVariables;

        const clientOptions: {
            baseUrl: string;
            accessToken: string;
            userId: string;
            deviceId: string;
        } | undefined = this._environment?.matrixClient?.clientOptions;

        mxLogger.setLevel(mxLogger.levels.ERROR);

        try {
            if (clientOptions) {
                this._matrixClient = sdk.createClient(clientOptions);
                this._loggerService.log("Created matrix client");

                this._matrixClient.startClient();
                this._loggerService.log("Started matrix client");
            } else {
                throw new Error("Client options are undefined, cannot create matrix client");
            }
        } catch (error) {
            throw new Error("Error initiating matrix client: " + error);
        }
    }

    public sendMessage(payload: IMatrixPlayload) {
        if (!payload || !this._environment || !this._matrixClient) {
            throw new Error("sendMessage: Missing payload, environment, or matrix client.");
        }

        const content = {
            body: `Matrix Door Phone Client: Magic Link request`,
            format: "org.matrix.custom.html",
            formatted_body: `<i>${payload.deviceId}</i> requested a magic link:<br><br>Verification code: <strong>${payload.sixDigitNumber}</strong><br><br><a href="${payload.magicLink}">Click to verify!</a>`,
            msgtype: "m.text",
        };

        const roomId = this._environment.matrixClient.roomOptions?.roomId;
        this._loggerService.log("Sending message to matrix client");

        this._matrixClient.sendEvent(roomId, "m.room.message", content, "").catch((err) => {
            this._loggerService.error("sendMessage: Error sending message to matrix client", err);
        });
    }

}

const MatrixService = MatrixServiceSingleton.getInstance();

export default MatrixService;