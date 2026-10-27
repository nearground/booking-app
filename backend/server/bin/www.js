#!/usr/bin/env node

import { createRequire } from 'node:module';
import app from '../app.js';

const require = createRequire(import.meta.url);

/**
 * Module dependencies.
 */
const http = require('http');
const createDebug = require('debug');
const debug = createDebug('app:server');

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '4000');
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    const normalizedPort = parseInt(val, 10);

    if (Number.isNaN(normalizedPort)) {
        return val;
    }

    if (normalizedPort >= 0) {
        return normalizedPort;
    }

    return false;
}

/**
 * Listener for HTTP server "error" signal.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    switch (error.code) {
        case 'EACCES':
            // eslint-disable-next-line no-console
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            // eslint-disable-next-line no-console
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Listener for HTTP server "listening" signal.
 */
function onListening() {
    const address = server.address();
    const bind = typeof address === 'string' ? `pipe ${address}` : `port ${address.port}`;
    debug(`Listening on ${bind}`);
}
