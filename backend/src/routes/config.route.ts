import { Router, Request } from 'express';
import isAuthenticated from '../middleware/auth.middleware';
import EnvironmentService from '../services/environment.service';
import LoggerService from '../services/logger.service';

const configRouter = Router();
const logger = new LoggerService("Config-Route", "#000", "#00ded6", true);

configRouter.get("/app", isAuthenticated, (req, res) => {
    logRequest(req);
    res.status(200).json(EnvironmentService.appEnvironment);
});

configRouter.get("/mqtt", isAuthenticated, (req, res) => {
    logRequest(req);
    res.status(200).json(EnvironmentService.mqttEnvironment);
});

configRouter.get("/matrix", isAuthenticated, (req, res) => {
    logRequest(req);
    res.status(200).json(EnvironmentService.matrixEnvironment);
});

function logRequest(req: Request) {
    logger.log(`${req.method}-request from ${req.headers.referer} on route: ${req.originalUrl}`)
}

export default configRouter;