/**
 * HTTP request logging middleware
 * Logs all HTTP requests with timing, status codes, and request/response data
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { randomUUID } from 'crypto';

// Extend Request interface to include requestId
declare module 'express' {
    interface Request {
        requestId?: string;
        startTime?: number;
    }
}

/**
 * Middleware to add request ID to each request for correlation
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}

/**
 * Middleware to log HTTP requests
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
    req.startTime = Date.now();
    
    // Log health checks at DEBUG level only to reduce noise
    const isHealthCheck = req.path === '/api/status' && req.method === 'GET';
    
    if (!isHealthCheck) {
        const requestInfo: any = {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip || req.socket.remoteAddress
        };
        
        // Log request body for POST/PUT/PATCH methods
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const safeBody = { ...req.body };
            requestInfo.body = safeBody;
        }
        
        logger.info(`Incoming request`, requestInfo);
    } else {
        logger.debug(`Health check request`, {
            requestId: req.requestId,
            method: req.method,
            path: req.path
        });
    }
    
    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;
    let responseLogged = false;
    
    const logResponse = () => {
        if (responseLogged) return; // Prevent duplicate logging
        responseLogged = true;
        
        const duration = Date.now() - (req.startTime || Date.now());
        const responseInfo = {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        };
        
        if (!isHealthCheck) {
            if (res.statusCode >= 400) {
                logger.error(`Request failed`, responseInfo);
            } else {
                logger.info(`Request completed`, responseInfo);
            }
        } else {
            logger.debug(`Health check completed`, responseInfo);
        }
    };
    
    res.send = function(data: any) {
        logResponse();
        return originalSend.call(this, data);
    };
    
    res.json = function(data: any) {
        logResponse();
        return originalJson.call(this, data);
    };
    
    next();
}
