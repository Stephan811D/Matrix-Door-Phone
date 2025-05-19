//Environment
import dotenv from 'dotenv';
dotenv.config();

//Express
import express from 'express';
import { Request, Response } from 'express';

//Server
import cors from 'cors';

//Routes
import configRouter from "./routes/config.route";
import reportRouter from "./routes/report.route";

//Views
import { fileURLToPath } from 'url';
import path from 'path';

//Utils
import { generateMagicLinkToken, verifyMagicLinkToken, generateSixDigitNumber, generateSessionId } from "./utils/auth.utils";

//Services
import EnvironmentService from './services/environment.service';
import ServerService from './services/server.service';
import DatabaseService from './services/database.service';
import LoggerService from './services/logger.service';
import MatrixService from './services/matrix.service';

//Session
import { loadSessionConfig, SessionService } from './services/session.service';

//Interfaces
import { Device } from "./interfaces/models/device.interface";
import { Session } from "./interfaces/models/session.interface";
import { Token } from "./interfaces/models/token.interface";
import { AuthStatus } from "./interfaces/models/auth-status.interface";
import { IMatrixPlayload } from './interfaces/models/matrix-payload.interface'

const loggerService = new LoggerService("Server", "#000", "#7100b3", true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initBackendApp = async () => {
    try {
        await EnvironmentService.init();

        const app = express();
        const serverPort = EnvironmentService.serverVariables?.port;
        const server = ServerService.createServer(app);

        if (!server || !serverPort) {
            throw new Error('Server or port not defined');
        }

        DatabaseService.createPool();

        app.use(loadSessionConfig());
        app.use(cors(ServerService.getCorsSettings()));
        app.use(express.json());

        app.use("/config", configRouter);
        app.use("/report", reportRouter);

        app.set('views', path.join(__dirname, 'views'));
        app.set('view engine', 'ejs');

        app.post('/request-magic-link', async (req: Request, res: Response) => {
            const deviceId = req.body.deviceId as string;

            if (!deviceId) {
                loggerService.error("/request-magic-link: deviceId is required.")
                return res.status(400).json({ error: "deviceId is required." });
            }

            const authVariables = EnvironmentService.authenticationVariables;

            const sessionId = generateSessionId();
            const sixDigitNumber = generateSixDigitNumber();
            const magicLinkPayload = { deviceId, sessionId, sixDigitNumber };
            const tokenSecret = authVariables?.magicLink?.secret;
            const magicLinkTtlMin = authVariables?.magicLink?.ttlMin;

            const token = generateMagicLinkToken(magicLinkPayload, tokenSecret, magicLinkTtlMin);
            const protocol = EnvironmentService.serverVariables?.https ? "https" : "http";
            const magicLinkBaseUrl = authVariables?.magicLink?.baseUrl;
            const magicLinkBaseUrlPort = authVariables?.magicLink?.baseUrlPort;

            try {
                let device: Device | undefined = await DatabaseService.getDevice(deviceId);

                if (device === undefined) {
                    device = await DatabaseService.addDevice(deviceId);
                }

                if (device) {
                    const sessionIdPk = await DatabaseService.addSession(device.id, sessionId);

                    if (sessionIdPk) {
                        await DatabaseService.addToken(sessionIdPk, token, sixDigitNumber);
                    }
                }

                const magicLink = `${protocol}://${magicLinkBaseUrl}:${magicLinkBaseUrlPort}/authenticate?token=${token}`;
                const msgPayload: IMatrixPlayload = { deviceId: deviceId, sixDigitNumber: sixDigitNumber, magicLink: magicLink, }

                MatrixService.sendMessage(msgPayload)
                loggerService.log(`/request-magic-link: ${deviceId} requested a magic link: ${magicLink}`);

                res.status(200).json({
                    verificationNumber: sixDigitNumber,
                    ttl_min: magicLinkTtlMin,
                    session: sessionId
                });

            }
            catch (err) {
                loggerService.error('/request-magic-link: ' + err);
                res.status(500).json({ error: '/request-magic-link: ' + err });
            }
        });

        app.get('/authenticate', async (req: Request<{ token: string }>, res: Response) => {
            const token = req.query.token as string;

            if (!token) {
                loggerService.error("/authenticate: token is required.")
                return res.status(400).json({ error: "Token is required." });
            }

            try {
                const decoded = verifyMagicLinkToken(token, EnvironmentService.authenticationVariables?.magicLink.secret);
                const deviceId = decoded.deviceId;
                const sessionId = decoded.sessionId;

                console.log(deviceId);
                console.log(sessionId)

                const session: Session | undefined = await DatabaseService.getSession(sessionId);

                if (session === undefined) {
                    return res.status(401).json({ error: "Corresponding session not found." });
                }

                await DatabaseService.verifyToken(token, session.id);

                loggerService.log(`/authenticate: ${deviceId} verified magic link with code: ${decoded.sixDigitNumber}`);
                res.render('deviceVerified.ejs', { deviceId: decoded.deviceId, sixDigitCode: decoded.sixDigitNumber });
            } catch (err) {
                loggerService.error('/authenticate: ' + err);
                res.render('invalidToken.ejs', { err: err });
            }
        })

        app.get('/check-auth-status', async (req: Request<{ sessionId: string }>, res: Response) => {
            const sessionId = req.query.sessionId as string;

            if (!sessionId) {
                loggerService.error("/check-auth-status: session-id is required.")
                return res.status(400).json({ error: "session-id is required." });
            }

            try {
                const status: AuthStatus | undefined = await DatabaseService.checkAuthStatus(sessionId);

                if (status) {
                    if (status.session_verified_at) {
                        return res.status(409).json({ error: "Session has already been verified." });
                    }

                    if (status.token_verified_at) {
                        await DatabaseService.updateSessionVerification(status.session_id);
                        const token: Token | undefined = await DatabaseService.getToken(status.token_id);
                        let allowedRequestOrigins = EnvironmentService?.serverVariables?.allowedRequestOrigins || "";

                        if (!token) {
                            loggerService.error("/check-auth-status: token not found")
                            throw new Error("Token not found");
                        }

                        SessionService.setSessionData(req, token.session_id);
                        loggerService.log(`/check-auth-status: ${token.six_digit_number} status checked`);

                        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
                        res.setHeader('Access-Control-Allow-Origin', allowedRequestOrigins);

                        return res.status(200).json({
                            authenticated: true,
                            sixDigitNumber: token?.six_digit_number
                        });
                    }
                }

                return res.status(401).json({
                    authenticated: false
                });

            } catch (err) {
                loggerService.error("/check-auth-status:", err);
                res.status(500).json({ error: "An internal error occurred." });
            }
        });

        server.listen(serverPort, () => {
            MatrixService.initClient();
            loggerService.log(`Serving ${ServerService.serverType} server on port ${serverPort}`);
        });

    } catch (error) {
        loggerService.error('Error setting up the server', error);
        process.exit(1);
    }
}

initBackendApp();