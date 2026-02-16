/**
 * Simple logger utility with different log levels and timestamps
 * Supports log level filtering via LOG_LEVEL environment variable
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

const logLevelMap: Record<string, LogLevel> = {
    'DEBUG': LogLevel.DEBUG,
    'INFO': LogLevel.INFO,
    'WARN': LogLevel.WARN,
    'ERROR': LogLevel.ERROR
};

// Get log level from environment variable, default to INFO
const currentLogLevel = logLevelMap[process.env.LOG_LEVEL?.toUpperCase() || 'INFO'] || LogLevel.INFO;

/**
 * Format log message with timestamp and level
 */
function formatLog(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
        if (data instanceof Error) {
            logMessage += `\n  Error: ${data.message}`;
            if (data.stack) {
                logMessage += `\n  Stack: ${data.stack}`;
            }
        } else if (typeof data === 'object') {
            try {
                logMessage += `\n  Data: ${JSON.stringify(data, null, 2)}`;
            } catch (e) {
                logMessage += `\n  Data: [Object - could not stringify]`;
            }
        } else {
            logMessage += `\n  Data: ${data}`;
        }
    }
    
    return logMessage;
}

export const logger = {
    debug(message: string, data?: any): void {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.log(formatLog('DEBUG', message, data));
        }
    },
    
    info(message: string, data?: any): void {
        if (currentLogLevel <= LogLevel.INFO) {
            console.log(formatLog('INFO', message, data));
        }
    },
    
    warn(message: string, data?: any): void {
        if (currentLogLevel <= LogLevel.WARN) {
            console.warn(formatLog('WARN', message, data));
        }
    },
    
    error(message: string, data?: any): void {
        if (currentLogLevel <= LogLevel.ERROR) {
            console.error(formatLog('ERROR', message, data));
        }
    }
};
