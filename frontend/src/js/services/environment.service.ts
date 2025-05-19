//Files
import { name, version } from '../../../package.json';

//Services
import LoggerService from './logger.service';

//Interfaces
import IEnvironment from '../../interfaces/IEnvironment';

class EnvironmentServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: EnvironmentServiceSingleton;

    private _environment: IEnvironment | undefined;
    private _missingValues: Array<string>

    constructor() {
        this._loggerService = new LoggerService("Environment-Service", "green", "white");
        this._missingValues = [];
        this._environment = undefined;
        this.init();
        this._loggerService.log("Service initialized");
    }

    public static getInstance(): EnvironmentServiceSingleton {
        if (!EnvironmentServiceSingleton._instance) {
            EnvironmentServiceSingleton._instance = new EnvironmentServiceSingleton();
        }
        return EnvironmentServiceSingleton._instance;
    }

    public async init() {
        try {
            this.loadEnvironment();
            this._loggerService.log(`Starting app in ${this._environment?.mode} mode`);
            if (this._missingValues.length > 0) {
                throw new Error(`Missing environment variables: ${this._missingValues.join(', ')}`);
            }
        } catch (error) {
            if (error instanceof Error) {
                this._loggerService.error(`Initialization error: ${error.message}`);
            } else {
                this._loggerService.error(`Unknown error during initialization`);
            }
            throw error;
        }
    }

    private loadEnvironment() {
        this._environment = {
            mode: this.getEnvironmentMode(),
            https: this.validateBoolean("API_HTTPS", process.env.API_HTTPS),
            apiUrl: this.validateString("API_URL", process.env.API_URL),
            apiPort: this.validateNumber("API_PORT", process.env.API_PORT)
        };
    }

    public getEnvironmentMode(): string {
        return process.env.NODE_ENV === 'production' ? 'production' : 'development';
    }

    public getAppName(): string {
        return name;
    }

    public getAppVersion(): string {
        return version;
    }

    get environment() {
        return this._environment
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