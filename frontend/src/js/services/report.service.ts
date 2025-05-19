//Libs
import axios, { AxiosResponse } from 'axios';

//Servies
import LoggerService from "./logger.service";
import EnvironmentService from './environment.service';
import DataService from './data.service';

//Interfaces
import { MatrixCall } from 'matrix-js-sdk';
import { VisitorInputType } from '../../types/visitor.types';
import SmartHomeService from './smart-home.service';

class ReportServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: ReportServiceSingleton;

    private _protocol: string | undefined = undefined;
    private _baseUrl: string | undefined = undefined;
    private _port: number | undefined = undefined;

    constructor() {
        this._loggerService = new LoggerService("Report-Service", "#006eff", "#000");
        this._loggerService.log("Service initialized");
    }

    public static getInstance(): ReportServiceSingleton {
        if (!ReportServiceSingleton._instance) {
            ReportServiceSingleton._instance = new ReportServiceSingleton();
        }
        return ReportServiceSingleton._instance;
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

    async reportCall(call: MatrixCall, startTime: number | undefined) {
        if (call && startTime) {
            let reportObject = {
                deviceId: DataService.appDeviceId,
                callId: call?.callId,
                startTime: new Date(startTime),
                endTime: new Date(Date.now()),
                roomId: call.roomId,
                hangUpParty: call?.hangupParty,
                hangUpReason: call?.hangupReason,
                direction: call?.direction
            }

            try {
                const response = await this.postData<any>('/report/call', reportObject);

                if (response.status = 200) {
                    this._loggerService.log("reported call");
                    ReportService.reportParticipant(call);
                }
                else {
                    throw new Error('was not able to report call');
                }
            } catch (error) {
                this._loggerService.error('error:', error);
            }
        }
    }

    async reportParticipant(call: MatrixCall) {
        const participant = call.getOpponentMember();

        if (participant) {
            let reportObject = {
                callId: call.callId || undefined,
                rawDisplayName: participant?.user?.rawDisplayName || undefined,
                mxid: participant?.user?.userId || undefined,
                matrixDeviceId: call.getOpponentDeviceId() !== undefined ? call.getOpponentDeviceId() : null
            }

            console.log(participant)
            console.log(reportObject)

            try {
                const response = await this.postData<any>('/report/call-participant', reportObject);

                if (response.status = 200) {
                    this._loggerService.log("reported call participant");
                }
                else {
                    throw new Error('was not able to report call participant');
                }
            } catch (error) {
                this._loggerService.error('error:', error);
            }
        }
    }

    async reportVisitorInput(input: VisitorInputType) {
        if (input) {
            let reportObject = {
                deviceId: DataService.appDeviceId,
                type: input,
                triggeredAt: new Date(Date.now()),
                smartHomeState: SmartHomeService.getCurrentSmartHomeState()
            }

            try {
                const response = await this.postData<any>('/report/visitor-input', reportObject);

                if (response.status = 200) {
                    this._loggerService.log("reported visitor input");
                }
                else {
                    throw new Error('was not able to report visitor input');
                }
            } catch (error) {
                this._loggerService.error('error:', error);
            }
        }
    }

    async fetchData<T>(route: string): Promise<AxiosResponse<T>> {
        return this.makeRequest<T>('GET', route);
    }

    async postData<T>(route: string, data: any): Promise<AxiosResponse<T>> {
        return this.makeRequest<T>('POST', route, data);
    }

    async makeRequest<TResponse, TData = unknown>(method: string, route: string, data?: TData): Promise<AxiosResponse<TResponse>> {
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
            return response;
        } catch (error) {
            this._loggerService.error(`Error during request`, error);
            throw error;
        }
    }

}

const ReportService = ReportServiceSingleton.getInstance();

export default ReportService;