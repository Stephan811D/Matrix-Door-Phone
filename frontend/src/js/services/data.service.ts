//Libs
import axios from 'axios';

//Constants
import CONST from '../../utils/constants';

//Interfaces
import IAppConfig from '../../interfaces/IAppEnvironment'
import IMqttConfig from '../../interfaces/IMqttConfig';
import IMatrixConfig from '../../interfaces/IMatrixConfig';
import { MagicLinkRequestPayload, MagicLinkResponsePayload } from '../../interfaces/IDataService'

//Services
import LoggerService from './logger.service';
import EnvironmentService from './environment.service';
import ScreenService from './screen.service';

class DataServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: DataServiceSingleton;

    private _appConfig: IAppConfig | undefined = undefined;
    private _mqttConfig: IMqttConfig | undefined = undefined;
    private _matrixConfig: IMatrixConfig | undefined = undefined;

    private _protocol: string | undefined = undefined;
    private _baseUrl: string | undefined = undefined;
    private _port: number | undefined = undefined;

    private _devideId: string;

    private _pollInterval: any;
    private _pollIntervalDelaySeconds: number;

    constructor() {
        this._loggerService = new LoggerService("Data-Service", "yellow", "black");
        this._devideId = "matrixDoorPhone"; //process ENV?
        this._pollIntervalDelaySeconds = 10;
    }

    public static getInstance(): DataServiceSingleton {
        if (!DataServiceSingleton._instance) {
            DataServiceSingleton._instance = new DataServiceSingleton();
        }
        return DataServiceSingleton._instance;
    }

    public async init(): Promise<void> {
        try {
            const apiHttps = EnvironmentService.environment?.https;
            const apiUrl = EnvironmentService.environment?.apiUrl;
            const apiPort = EnvironmentService.environment?.apiPort;

            if (apiHttps !== undefined && apiUrl && apiPort) {
                this._protocol = apiHttps ? "https" : "http";
                this._baseUrl = apiUrl;
                this._port = apiPort;
                this._loggerService.log("Data service initialized");
            }
            else {
                throw Error("API information missing");
            }
        } catch (error) {
            this._loggerService.error("Error while initializing service", error);
            throw error;
        }
    }

    public async getConfigs(): Promise<void> {
        try {
            await this.loadConfigs();
            this._loggerService.log("Session was still valid");
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response) {
                if (error.response.status === 401) {
                    this._loggerService.log("Session not valid. Authentication process starts now.");
                    await this.requestMagicLink();
                } else {
                    this._loggerService.error("Error while loading configurations", error);
                }
            } else {
                this._loggerService.error("Unknown error occurred", error);
                throw error;
            }
        }
    }

    private async loadConfigs(): Promise<void> {
        try {
            const [appConfig, mqttConfig, matrixConfig] = await Promise.all([
                this.fetchData<IAppConfig>('/config/app'),
                this.fetchData<IMqttConfig>('/config/mqtt'),
                this.fetchData<IMatrixConfig>('/config/matrix')
            ]);

            this._appConfig = appConfig;
            this._mqttConfig = mqttConfig;
            this._matrixConfig = matrixConfig;

            this._loggerService.log("All configurations loaded successfully.");
        } catch (error) {
            this._loggerService.error("Error while loading configurations", error);
            throw error;
        }
    }

    async requestMagicLink(): Promise<void> {
        try {
            const payload: MagicLinkRequestPayload = { deviceId: this._devideId };
            const response = await this.postData<MagicLinkResponsePayload>('/request-magic-link', payload);
            this._loggerService.log('Magic link requested successfully.');

            ScreenService.setAuthenticationScreenData(response);
            ScreenService.showPage(CONST.PAGES.AUTHENTICATION_SCREEN);

            await this.pollAuthenticationState(response.session, response.ttl_min);
            clearInterval(this._pollInterval);
            await this.loadConfigs();
        } catch (error) {
            this._loggerService.error('Error requesting magic link', error);
            throw error;
        }
    }

    private async pollAuthenticationState(session: string, magicLinkTtl: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const pollStartTime = Date.now();
            this._pollInterval = setInterval(async () => {
                const currentTime = Date.now();
                const deltaTime = (currentTime - pollStartTime) / 1000;

                if (deltaTime > (magicLinkTtl * 60)) {
                    clearInterval(this._pollInterval);
                    reject(new Error("Magic link is not valid anymore. Stopping polling."));
                    return;
                }

                try {
                    await this.fetchData(`/check-auth-status?sessionId=${session}`);
                    clearInterval(this._pollInterval);
                    resolve();
                } catch (error: unknown) {
                    if (axios.isAxiosError(error) && error.response) {
                        if (error.response.status === 401) {
                            this._loggerService.error("App not authenticated yet. Trying to get auth status in 10 seconds.");
                        } else {
                            clearInterval(this._pollInterval);
                            reject(error);
                        }
                    } else {
                        clearInterval(this._pollInterval);
                        reject(error);
                    }
                }
            }, (this._pollIntervalDelaySeconds || 10) * 1000);
        });
    }

    async fetchData<T>(route: string): Promise<T> {
        return this.makeRequest<T>('GET', route);
    }

    async postData<T>(route: string, data: any): Promise<T> {
        return this.makeRequest<T>('POST', route, data);
    }

    async makeRequest<TResponse, TData = unknown>(method: string, route: string, data?: TData): Promise<TResponse> {
        try {
            const url = `${this._protocol}://${this._baseUrl}:${this._port}${route}`;
            const headers = { 'Content-Type': 'application/json' }
            const options = { withCredentials: true, headers: headers };
            let response;

            if (method === 'GET') {
                response = await axios.get<TResponse>(url, options);
            } else if (method === 'POST') {
                response = await axios.post<TResponse>(url, data, options);
            } else {
                throw new Error("Method not defined");
            }

            this._loggerService.log(`Request to: ${url} successfull`);
            return response.data;
        } catch (error) {
            this._loggerService.error(`Error during request`, error);
            throw error;
        }
    }

    get appConfigs(): IAppConfig | undefined {
        return this._appConfig;
    }

    get mqttConfigs(): IMqttConfig | undefined {
        return this._mqttConfig;
    }

    get matrixConfigs(): IMatrixConfig | undefined {
        return this._matrixConfig;
    }

    get appDeviceId(): string {
        return this._devideId;
    }
}

const DataService = DataServiceSingleton.getInstance();

export default DataService;