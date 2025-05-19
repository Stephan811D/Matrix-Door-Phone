//libs
import mysql, { Pool, RowDataPacket } from 'mysql2/promise';

//services
import LoggerService from './logger.service';
import EnvironmentService from './environment.service';

//types & interfaces
import { Device } from "../interfaces/models/device.interface";
import { Session } from "../interfaces/models/session.interface";
import { Token } from "../interfaces/models/token.interface";
import { AuthStatus } from "../interfaces/models/auth-status.interface";
import { Call } from "../interfaces/models/call.interface";
import { Participant } from "../interfaces/models/participant.inteface";
import { Room } from "../interfaces/models/room.interface";

//utils
import { toMySqlTimestamp } from '../utils/sql.utils'

class DatabaseServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: DatabaseServiceSingleton;
    private _pool: Pool | undefined;

    constructor() {
        this._loggerService = new LoggerService("Database-Service", "#000", "#b36500", true);
        this._pool = undefined;
    }

    public createPool() {
        const databaseVariables = EnvironmentService.databaseVariables;

        if (!databaseVariables) {
            this._loggerService.error("SQL pool creation failed: Database configuration is undefined.");
            throw new Error("Database configuration is undefined.");
        }

        const { host, port, user, password, database } = databaseVariables;

        if (!host || !port || !user || !password || !database) {
            this._loggerService.error(`SQL pool creation failed: Missing database configuration variables`);
            throw new Error(`Missing database configuration variables`);
        }

        this._loggerService.log(`Creating SQL pool on host ${host}:${port} - database: ${database}`);

        try {
            this._pool = mysql.createPool({
                host: host,
                port: port,
                user: user,
                password: password,
                database: database,
                waitForConnections: true,
                connectionLimit: 10,
                maxIdle: 10,
                idleTimeout: 60000,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });

            this._loggerService.log("SQL pool created successfully.");
        } catch (error) {
            this._loggerService.error("SQL pool creation failed:", error);
            throw error;
        }
    }

    public static getInstance(): DatabaseServiceSingleton {
        if (!DatabaseServiceSingleton._instance) {
            DatabaseServiceSingleton._instance = new DatabaseServiceSingleton();
        }
        return DatabaseServiceSingleton._instance;
    }

    isDevice(row: any): row is Device {
        return row && typeof row?.id === 'number' && typeof row?.name === 'string' && typeof row?.created_at === 'object';
    }

    isSession(row: any): row is Session {
        return row && typeof row?.id === 'number' && typeof row?.device_id === 'number' && typeof row?.session_id === 'string' && typeof row?.verified_at === 'object' && typeof row?.created_at === 'object';
    }

    isToken(row: any): row is Token {
        return row && typeof row?.id === 'number' && typeof row?.session_id === 'number' && typeof row?.token === 'string' && typeof row?.six_digit_number === 'number' && typeof row?.verified_at === 'object' && typeof row?.created_at === 'object';
    }

    isAuthStatus(row: any): row is AuthStatus {
        return row && typeof row?.token_id === 'number' && typeof row?.session_id === 'number' && typeof row?.session_verified_at === 'object' && typeof row?.token_verified_at === 'object';
    }

    isCall(row: any): row is Call {
        return row && typeof row?.id === 'string' && typeof row?.device_id === 'number' && typeof row?.direction === 'string' && typeof row?.started_at === 'object' && typeof row?.ended_at === 'object' && typeof row?.hang_up_party === 'string' && typeof row?.hang_up_reason === 'string';
    }

    isRoom(row: any): row is Room {
        return row && typeof row?.id === 'number' && typeof row?.room_id;
    }

    isParticipant(row: any): row is Participant {
        return row && typeof row?.id === 'number' && typeof row?.raw_display_name === 'string' && typeof row?.matrix_device_id === 'string' && typeof row?.mxid === 'string';
    }

    public async getDevice(identifier: string | number): Promise<Device | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            let query = '';
            let queryParams = [];

            if (typeof identifier === 'number') {
                query = 'SELECT * FROM devices WHERE id = ?';
                queryParams = [identifier];
            } else {
                query = 'SELECT * FROM devices WHERE name = ?';
                queryParams = [identifier];
            }

            const [rows] = await this._pool.execute<RowDataPacket[]>(query, queryParams);
            if (rows.length > 0) {
                const deviceRow = rows[0];
                if (this.isDevice(deviceRow)) {
                    return deviceRow;
                } else {
                    throw new Error('Retrieved data does not match Device type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error finding device:', error);
        }
    }

    private async getCall(identifier: number): Promise<Call | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this._pool.execute<RowDataPacket[]>('SELECT * FROM calls WHERE id = ?', [identifier]);
            if (rows.length > 0) {
                const callRow = rows[0];
                if (this.isCall(callRow)) {
                    return callRow;
                } else {
                    throw new Error('Retrieved data does not match Call type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error finding call:', error);
        }
    }

    private async getRoom(identifier: string): Promise<Room | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this._pool.execute<RowDataPacket[]>('SELECT * FROM call_rooms WHERE room_id = ?', [identifier]);
            if (rows.length > 0) {
                const roomRow = rows[0];
                if (this.isRoom(roomRow)) {
                    return roomRow;
                } else {
                    throw new Error('Retrieved data does not match Call type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error finding call:', error);
        }
    }

    private async getParticipant(identifier: string): Promise<Participant | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this._pool.execute<RowDataPacket[]>('SELECT * FROM call_participants WHERE mxid = ?', [identifier]);
            if (rows.length > 0) {
                const participantRow = rows[0];
                if (this.isParticipant(participantRow)) {
                    return participantRow;
                } else {
                    throw new Error('Retrieved data does not match Call type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error finding call:', error);
        }
    }

    public async addDevice(name: string): Promise<Device | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        if (!name) {
            throw new Error('Invalid device name');
        }

        try {
            const [insertResult] = await this._pool.execute<mysql.ResultSetHeader>('INSERT INTO devices (name) VALUES (?)', [name]);
            const deviceId = insertResult.insertId;
            let device: Device | undefined = await this.getDevice(deviceId);

            if (!device) {
                throw new Error('Error retrieving device after adding: ' + name);
            }
            return device;

        } catch (error) {
            this.handleError('Error adding device:', error);
        }
    }

    public async addSession(deviceId: number, sessionId: string): Promise<number | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [result] = await this._pool.execute<mysql.ResultSetHeader>('INSERT INTO magic_link_sessions (device_id, session_id) VALUES (?, ?)', [deviceId, sessionId]);
            return result.insertId;
        } catch (error) {
            this.handleError('Error adding session:', error);
        }
    }

    public async addToken(sessionIdPk: number, token: string, sixDigitNumber: number): Promise<void> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            await this._pool.execute('INSERT INTO magic_link_tokens (session_id, token, six_digit_number) VALUES (?, ?, ?)', [sessionIdPk, token, sixDigitNumber]);
        } catch (error) {
            this.handleError('Error adding token:', error);
        }
    }

    public async getSession(sessionId: string): Promise<Session | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this._pool.execute<RowDataPacket[]>('SELECT * FROM magic_link_sessions WHERE session_id = ?', [sessionId]);
            if (rows.length > 0) {
                const sessionRow = rows[0];
                if (this.isSession(sessionRow)) {
                    return sessionRow;
                } else {
                    throw new Error('Retrieved data does not match Session type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error finding session by session_id:', error);
        }
    }

    public async getToken(tokenId: number): Promise<Token | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [rows] = await this._pool.execute<RowDataPacket[]>('SELECT * FROM magic_link_tokens WHERE Id = ?', [tokenId]);
            if (rows.length > 0) {
                const tokenRow = rows[0];
                if (this.isToken(tokenRow)) {
                    return tokenRow;
                } else {
                    throw new Error('Retrieved data does not match Token type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error finding token by tokenId:', error);
        }
    }

    public async verifyToken(token: string, sessionIdPk: number): Promise<void> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [result] = await this._pool.execute<mysql.ResultSetHeader>('UPDATE magic_link_tokens SET verified_at = CURRENT_TIMESTAMP WHERE token = ? AND session_id = ?', [token, sessionIdPk]);

            if (result.affectedRows === 0) {
                throw new Error('Token verification failed or token not found');
            }
        } catch (error) {
            this.handleError('Error verifying token:', error);
        }
    }

    public async checkAuthStatus(sessionId: string): Promise<AuthStatus | undefined> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const query = `
                SELECT magic_link_tokens.id AS token_id, magic_link_sessions.id AS session_id, magic_link_sessions.verified_at AS session_verified_at, magic_link_tokens.verified_at AS token_verified_at 
                FROM magic_link_sessions 
                LEFT JOIN magic_link_tokens ON magic_link_sessions.id = magic_link_tokens.session_id 
                WHERE magic_link_sessions.session_id = ?`;

            const [rows] = await this._pool.execute<RowDataPacket[]>(query, [sessionId]);

            if (rows.length > 0) {
                const tokenRow = rows[0];
                if (this.isAuthStatus(tokenRow)) {
                    return tokenRow;
                } else {
                    throw new Error('Retrieved data does not match AuthStatus type');
                }
            } else {
                return undefined;
            }
        } catch (error) {
            this.handleError('Error checking authentication status:', error);
        }
    }

    public async updateSessionVerification(sessionIdPk: number): Promise<void> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const [result] = await this._pool.execute<mysql.ResultSetHeader>('UPDATE magic_link_sessions SET verified_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionIdPk]);

            if (result.affectedRows === 0) {
                throw new Error('Session verification update failed or session not found');
            }
        } catch (error) {
            this.handleError('Error updating session verification:', error);
        }
    }

    public async addCallReport(callId: number, deviceName: number, direction: string, startTime: string, endTime: string, roomId: string, hangUpParty: string, hangUpReason: string): Promise<void> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const device = await this.getDevice(deviceName);

            if (!device) {
                throw new Error(`Device with ID ${deviceName} not found`);
            }

            let room = await this.getRoom(roomId);

            if (!room) {
                await this._pool.execute('INSERT INTO call_rooms (room_id) VALUES (?)', [roomId]);
                room = await this.getRoom(roomId)
            }

            let startedAt = toMySqlTimestamp(startTime);
            let endedAt = toMySqlTimestamp(endTime);

            await this._pool.execute('INSERT INTO calls (id, device_id, direction, started_at, ended_at, room_id, hang_up_party, hang_up_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [callId, device?.id, direction, startedAt, endedAt, room?.id, hangUpParty, hangUpReason]);
        } catch (error) {
            this.handleError('Error adding call report', error);
        }
    }

    public async addParticipantReport(callId: number, rawDisplayName: string, matrixDeviceId: string, mxid: string): Promise<void> {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            const call = await this.getCall(callId);

            if (!call) {
                throw new Error(`Call with ID ${callId} not found`);
            }

            let participant = await this.getParticipant(mxid);

            if (!participant) {
                await this._pool.execute('INSERT INTO call_participants (raw_display_name, matrix_device_id, mxid) VALUES (?, ?, ?)', [rawDisplayName, matrixDeviceId, mxid]);
                participant = await this.getParticipant(mxid)
            }

            await this._pool.execute('UPDATE calls SET participant_id = ? WHERE id = ?', [participant?.id, call?.id]);
        } catch (error) {
            this.handleError('Error adding call participant report', error);
        }
    }

    public async addVisitorReport(deviceId: string, type: string, triggerTime: string, smartHomeState: string) {
        if (!this._pool) {
            throw new Error('Database connection not initialized');
        }

        try {
            let device: Device | undefined = await this.getDevice(deviceId);

            if (!device) {
                throw new Error('Error retrieving device when adding visitor report');
            }

            let triggeredAt = toMySqlTimestamp(triggerTime);

            await this._pool.execute('INSERT INTO visitor_inputs (device_id, type, triggered_at, smart_home_state) VALUES (?, ?, ?, ?)', [device?.id, type, triggeredAt, smartHomeState]);
        } catch (error) {
            this.handleError('Error adding call report', error);
        }
    }

    get sqlPool(): Pool | undefined {
        return this._pool;
    }

    private handleError(errorMsg: string, error: Error | unknown): void {
        this._loggerService.error(`${errorMsg}:`, error);
        throw error;
    }

}

const DatabaseService = DatabaseServiceSingleton.getInstance();

export default DatabaseService;