import LoggerService from './logger.service';

import IEnvironment from '../interfaces/environment/environment.interface'
import IAppEnvironment from '../interfaces/environment/app-environment.interface';
import IMqttEnvironment from '../interfaces/environment/mqtt-environment.interface';
import IMatrixEnvironment from '../interfaces/environment/matrix-environment.interface';

import IServerVariables from '../interfaces/environment/server.interface';
import IDatabaseVariables from '../interfaces/environment/database.interface'
import IAuthenticationVariables from '../interfaces/environment/authentication.interface'

class EnvironmentServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: EnvironmentServiceSingleton;
    private _environment: IEnvironment | undefined;
    private _missingValues: Array<string>

    constructor() {
        this._loggerService = new LoggerService("Environment-Service", "#000", "#00b32f", true);
        this._missingValues = [];
        this._environment = undefined;
    }

    public static getInstance(): EnvironmentServiceSingleton {
        if (!EnvironmentServiceSingleton._instance) {
            EnvironmentServiceSingleton._instance = new EnvironmentServiceSingleton();
        }
        return EnvironmentServiceSingleton._instance;
    }

    public init(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.loadEnvironment()
                    .then(() => {
                        this._loggerService.log("Environment variables loaded successfully.");
                        resolve();
                    })
                    .catch((error) => {
                        this._loggerService.error("Error loading environment variables:", error);
                        reject(error);
                    });
            } catch (error) {
                this._loggerService.error("Unexpected error:", error);
                reject(error);
            }
        });
    }

    public async loadEnvironment() {
        try {
            this._loggerService.log(`Loading environment for: ${this.getAppName()} [${this.getAppVersion()}] in ${this.getEnvironmentMode()} mode`);

            const environment: IEnvironment = {
                mode: this.getEnvironmentMode(),
                server: {
                    options: this.getServerVariable(),
                    database: this.getDatabaseVariables(),
                    authentication: this.getAuthenticationVariables(),
                },
                client:
                {
                    app: this.getAppEnvironment(),
                    mqtt: this.getMqttEnvironment(),
                    matrix: this.getMatrixEnvironment(),
                }
            };

            if (this._missingValues.length > 0) {
                const missingVarsMessage = `Missing environment variable: ${this._missingValues.join(", ")}`;
                this._loggerService.log(missingVarsMessage);
                throw new Error(missingVarsMessage);
            }

            this._environment = environment;
            this._loggerService.log(`Environment successfully initialized`);
        }
        catch (error) {
            this._loggerService.log(error)
            throw error;
        }
    }

    public getAppName() {
        return process.env.npm_package_name;
    }

    public getAppVersion() {
        return process.env.npm_package_version;
    }

    public getEnvironmentMode(): string {
        return process.env.NODE_ENV === 'production' ? 'production' : 'development';
    }

    private getServerVariable(): IServerVariables {
        return {
            port: this.validateNumber("SERVER_PORT", process.env.SERVER_PORT),
            https: this.validateBoolean("SERVER_HTTPS", process.env.SERVER_HTTPS),
            allowedCorsOrigins: this.validateString("SERVER_ALLOWED_CORS_ORIGINS", process.env.SERVER_ALLOWED_CORS_ORIGINS),
            allowedRequestOrigins: this.validateString("SERVER_ALLOWED_REQUEST_ORIGINS", process.env.SERVER_ALLOWED_REQUEST_ORIGINS)
        };
    }
    private getDatabaseVariables(): IDatabaseVariables {
        return {
            host: this.validateString("DB_HOST", process.env.DB_HOST),
            port: this.validateNumber("DB_PORT", process.env.DB_PORT),
            user: this.validateString("DB_USER", process.env.DB_USER),
            password: this.validateString("DB_PASSWORD", process.env.DB_PASSWORD),
            database: this.validateString("DB_DATABASE", process.env.DB_DATABASE)
        };
    }
    private getAuthenticationVariables(): IAuthenticationVariables {
        return {
            magicLink: {
                baseUrl: this.validateString("AUTH_TOKEN_BASE_URL", process.env.AUTH_TOKEN_BASE_URL),
                baseUrlPort: this.validateNumber("AUTH_TOKEN_BASE_URL_PORT", process.env.AUTH_TOKEN_BASE_URL_PORT),
                ttlMin: this.validateNumber("AUTH_TOKEN_TTL_MIN", process.env.AUTH_TOKEN_TTL_MIN),
                secret: this.validateString("AUTH_TOKEN_SECRET_KEY", process.env.AUTH_TOKEN_SECRET_KEY),
            },
            session: {
                ttlMin: this.validateNumber("AUTH_SESSION_TTL_MIN", process.env.AUTH_SESSION_TTL_MIN),
                secret: this.validateString("AUTH_SESSION_SECRET_KEY", process.env.AUTH_SESSION_SECRET_KEY),
            },
            cookie: {
                ttlDays: this.validateNumber("AUTH_COOKIE_SESSION_TTL_DAYS", process.env.AUTH_COOKIE_SESSION_TTL_DAYS),
                secret: this.validateString("AUTH_COOKIE_SESSION_SECRET_KEY", process.env.AUTH_COOKIE_SESSION_SECRET_KEY)
            },
            matrixClient:
            {
                serverName: this.validateString("AUTH_MATRIX_SERVER_NAME", process.env.AUTH_MATRIX_SERVER_NAME),
                clientOptions: {
                    baseUrl: this.validateString("AUTH_MATRIX_BASE_URL", process.env.AUTH_MATRIX_BASE_URL),
                    accessToken: this.validateString("AUTH_MATRIX_ACCESS_TOKEN", process.env.AUTH_MATRIX_ACCESS_TOKEN),
                    userId: this.validateString("AUTH_MATRIX_USER_ID", process.env.AUTH_MATRIX_USER_ID),
                    deviceId: this.validateString("AUTH_MATRIX_DEVICE_ID", process.env.AUTH_MATRIX_DEVICE_ID),
                },
                roomOptions: {
                    roomName: this.validateString("AUTH_MATRIX_ROOM_NAME", process.env.AUTH_MATRIX_ROOM_NAME),
                    roomId: this.validateString("AUTH_MATRIX_ROOM_ID", process.env.AUTH_MATRIX_ROOM_ID)
                }
            }
        };
    }

    private getAppEnvironment(): IAppEnvironment {
        return {
            callUser: this.validateString("APP_CALL_USER", process.env.APP_CALL_USER),
            houseOwner: this.validateString("APP_HOUSE_OWNER", process.env.APP_HOUSE_OWNER),
            timeouts: {
                callScreenTimeoutSeconds: this.validateNumber("APP_CALL_SCREEN_TIMEOUT_SECONDS", process.env.APP_CALL_SCREEN_TIMEOUT_SECONDS),
                ringScreenTimeoutSeconds: this.validateNumber("APP_RING_SCREEN_TIMEOUT_SECONDS", process.env.APP_RING_SCREEN_TIMEOUT_SECONDS),
                doorScreenTimeoutSeconds: this.validateNumber("APP_DOOR_SCREEN_TIMEOUT_SECONS", process.env.APP_DOOR_SCREEN_TIMEOUT_SECONS)
            },
            theme: {
                startDarkMode: this.validateString("APP_THEME_DARK_MODE_START_TIME", process.env.APP_THEME_DARK_MODE_START_TIME),
                endDarkMode: this.validateString("APP_THEME_DARK_MODE_END_TIME", process.env.APP_THEME_DARK_MODE_END_TIME),
            },
            doorOpener: {
                openCmd: this.validateString("APP_DOOR_OPENER_OPEN_CMD", process.env.APP_DOOR_OPENER_OPEN_CMD),
                timeoutSeconds: this.validateNumber("APP_DOOR_OPENER_TIMEOUT_SECONDS", process.env.APP_DOOR_OPENER_TIMEOUT_SECONDS)
            }
        };
    }

    private getMqttEnvironment(): IMqttEnvironment {
        return {
            brokerName: this.validateString("MQTT_BROKER_NAME", process.env.MQTT_BROKER_NAME),
            brokerIp: this.validateString("MQTT_BROKER_IP", process.env.MQTT_BROKER_IP),
            brokerPort: this.validateNumber("MQTT_BROKER_PORT", process.env.MQTT_BROKER_PORT),
            protocol: this.validateString("MQTT_PROTOCOL", process.env.MQTT_PROTOCOL),
            path: this.validateString("MQTT_PATH", process.env.MQTT_PATH),
            clientOptions: {
                username: this.validateString("MQTT_USERNAME", process.env.MQTT_USERNAME),
                password: this.validateString("MQTT_PASSWORD", process.env.MQTT_PASSWORD),
                clientId: this.validateString("MQTT_CLIENT_ID", process.env.MQTT_CLIENT_ID),
                clean: this.validateBoolean("MQTT_CLEAN", process.env.MQTT_CLEAN),
                connectTimeout: this.validateNumber("MQTT_CONNECTION_TIMEOUT", process.env.MQTT_CONNECTION_TIMEOUT),
                reconnectPeriod: this.validateNumber("MQTT_RECONNECT_PERIOD", process.env.MQTT_RECONNECT_PERIOD)
            }
        }
    }

    private getMatrixEnvironment(): IMatrixEnvironment {
        return {
            serverName: this.validateString("MATRIX_SERVER_NAME", process.env.MATRIX_SERVER_NAME),
            clientOptions: {
                baseUrl: this.validateString("MATRIX_BASE_URL", process.env.MATRIX_BASE_URL),
                accessToken: this.validateString("MATRIX_ACCESS_TOKEN", process.env.MATRIX_ACCESS_TOKEN),
                userId: this.validateString("MATRIX_USER_ID", process.env.MATRIX_USER_ID),
                //deviceId: ''//this.validateString("MATRIX_DEVICE_ID", process.env.MATRIX_DEVICE_ID),
            },
            roomOptions: {
                roomName: this.validateString("MATRIX_ROOM_NAME", process.env.MATRIX_ROOM_NAME),
                roomId: this.validateString("MATRIX_ROOM_ID", process.env.MATRIX_ROOM_ID)
            }
        }
    }

    get environment(): IEnvironment | undefined {
        return this._environment;
    }

    get serverVariables(): IServerVariables | undefined {
        return this._environment?.server?.options;
    }

    get databaseVariables(): IDatabaseVariables | undefined {
        return this._environment?.server?.database;
    }

    get authenticationVariables(): IAuthenticationVariables | undefined {
        return this._environment?.server?.authentication;
    }

    get appEnvironment(): IAppEnvironment | undefined {
        return this._environment?.client?.app;
    }

    get mqttEnvironment(): IMqttEnvironment | undefined {
        return this._environment?.client?.mqtt;
    }

    get matrixEnvironment(): IMatrixEnvironment | undefined {
        return this._environment?.client?.matrix;
    }

    private validateString(key: string, value: string | undefined): string {
        if (typeof value === 'string' && value.trim() !== '') {
            return value;
        }
        this.logMissingValue(key);
        return "";
    }

    private validateNumber(key: string, value: string | undefined): number {
        const parsed = parseInt(value ?? '', 10);
        if (!isNaN(parsed)) {
            return parsed;
        }
        this.logMissingValue(key);
        return 0;
    }

    private validateBoolean(key: string, value: string | undefined): boolean {
        if (typeof value === 'undefined') {
            this.logMissingValue(key);
            return false;
        }
        return (value == "true");
    }

    private logMissingValue(key: string): void {
        this._loggerService.log(`Environment variable ${key} is not set or is invalid.`)
        this._missingValues.push(key);
    }
}

const EnvironmentService = EnvironmentServiceSingleton.getInstance();

export default EnvironmentService;