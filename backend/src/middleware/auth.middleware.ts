import { Request, Response, NextFunction } from 'express';

function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
    if (req.session?.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized access. Authentication required." });
    }
}
export default isAuthenticated;