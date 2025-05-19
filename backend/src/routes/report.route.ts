import { Router, Request } from 'express';
import isAuthenticated from '../middleware/auth.middleware';
import LoggerService from '../services/logger.service';
import DatabaseService from '../services/database.service';

const reportRouter = Router();
const logger = new LoggerService("Config-Route", "#000", "#00ded6", true);

reportRouter.post("/call", isAuthenticated, (req, res) => {
    logRequest(req);
    DatabaseService.addCallReport(req?.body?.callId, req?.body?.deviceId, req?.body?.direction, req?.body?.startTime, req?.body?.endTime, req?.body?.roomId, req?.body?.hangUpParty, req?.body?.hangUpReason);
    res.status(200).json(req?.body);
});

reportRouter.post("/call-participant", isAuthenticated, (req, res) => {
    logRequest(req);
    DatabaseService.addParticipantReport(req?.body?.callId, req?.body?.rawDisplayName, req?.body?.matrixDeviceId, req?.body?.mxid);
    res.status(200).json(req?.body);
});

reportRouter.post("/visitor-input", isAuthenticated, (req, res) => {
    logRequest(req);
    DatabaseService.addVisitorReport(req?.body?.deviceId, req?.body?.type, req?.body?.triggeredAt, req?.body?.smartHomeState);
    res.status(200).json(req?.body);
});

function logRequest(req: Request) {
    logger.log(`${req.method}-request from ${req.headers.referer} on route: ${req.originalUrl}`)
}

export default reportRouter;