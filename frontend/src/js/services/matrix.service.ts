//Libs
import matrixcs, { IRoomTimelineData, MatrixEvent, RoomEvent } from 'matrix-js-sdk';
import { logger as mxLogger } from 'matrix-js-sdk/lib/logger';
import { EventEmitter } from 'eventemitter3';

//Services
import LoggerService from './logger.service';
import DataService from './data.service';
import ScreenService from './screen.service';
import SmartHomeService from './smart-home.service';
import ReportService from './report.service';

//Constants
import CONST from '../../utils/constants.js';

//Interfaces
import IMatrixConfig from '../../interfaces/IMatrixConfig';
import { MatrixCall, SyncState, IEvent, MatrixClient, EmittedEvents, EventEmitterEvents, ClientEvent, Room } from 'matrix-js-sdk';
import { CallEvent, CallErrorCode } from 'matrix-js-sdk/lib/webrtc/call';
import { CallFeed } from 'matrix-js-sdk/lib/webrtc/callFeed';

class MatrixServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: MatrixServiceSingleton;

    private _configs: IMatrixConfig | undefined = undefined;
    private _matrixClient: MatrixClient | undefined = undefined
    private _call: MatrixCall | null = null;
    private _callStartTime: number | undefined = undefined;

    private _initialSyncDone: boolean = false;
    private _isConnected: boolean = false;
    private _appStartTimestamp = Date.now();
    private _eventEmitter: EventEmitter;

    constructor() {
        this._loggerService = new LoggerService("Matrix-Service", "#bdbdbd", "#000");
        this._eventEmitter = new EventEmitter();
        this._loggerService.log("Service initialized");
    }

    public static getInstance(): MatrixServiceSingleton {
        if (!MatrixServiceSingleton._instance) {
            MatrixServiceSingleton._instance = new MatrixServiceSingleton();
        }
        return MatrixServiceSingleton._instance;
    }

    private async loadMatrixConfig(): Promise<IMatrixConfig> {
        const configs = DataService.matrixConfigs;
        if (!configs) {
            throw new Error('Matrix configuration is missing or invalid');
        }
        return configs;
    }

    async initClient(): Promise<void> {
        await this.createClient();
        await this.startClient();
    }

    async createClient(): Promise<void> {
        try {
            this._configs = await this.loadMatrixConfig();

            if (!this._configs?.clientOptions) {
                throw new Error("Client options are missing");
            }

            this._eventEmitter.emit('matrixServerSet', this._configs.serverName);
            this._eventEmitter.emit('matrixRoomSet', this._configs.roomOptions.roomName);

            ///mxLogger.setLevel(mxLogger.levels.ERROR);

            let matrixConfigs = this._configs.clientOptions;
            matrixConfigs.deviceId = DataService.appDeviceId;

            this._matrixClient = matrixcs.createClient(matrixConfigs);
            this._loggerService.log("Matrix Client created successfully");
        } catch (error) {
            this._loggerService.error('Error creating Matrix Client:', error);
            throw error;
        }
    }

    async startClient(): Promise<void> {
        if (!this._matrixClient) {
            this._isConnected = false;
            this._eventEmitter.emit('matrixServerConnected', this._isConnected);
            return Promise.reject(new Error("Matrix Client is not initialized"));
        }

        this._loggerService.log("Starting Matrix Client");

        try {
            await this._matrixClient.startClient();
            this._isConnected = true;
            this._eventEmitter.emit('matrixServerConnected', this._isConnected);
            this.setMatrixMessageListener();

        } catch (error) {
            this._loggerService.error("Error starting Matrix Client", error);
            this._isConnected = false;
            this._eventEmitter.emit('matrixServerConnected', this._isConnected);
            return Promise.reject(error);
        }
        return Promise.resolve();
    }

    syncClient(): Promise<void> {
        if (!this._matrixClient) {
            return Promise.reject(new Error("Matrix Client is not initialized"));
        }
        const matrixClient = this._matrixClient;
        return new Promise((resolve, reject) => {
            matrixClient.on(ClientEvent.Sync, (state: SyncState) => {
                this._eventEmitter.emit('matrixClientSyncStateChanged', state);
                switch (state) {
                    case SyncState.Prepared: this._initialSyncDone = true; resolve(); break;
                    case SyncState.Error, SyncState.Stopped: reject(); break;
                }
            });
        });
    }

    setMatrixMessageListener() {
        // Exit function when Matrix client is not defined
        if (!this._matrixClient) {
            return;
        }

        // Define Matrix listener to handle incoming room events
        this._matrixClient.on(RoomEvent.Timeline, (event: MatrixEvent, _room: Room | undefined, toStartOfTimeline: boolean | undefined, _removed: boolean, data: IRoomTimelineData) => {

            // Exit function if relevant information is not available
            if (!event || toStartOfTimeline || !data.liveEvent) {
                return;
            }

            // Get content of received message
            const msgContent = event.getContent()?.body;
            if (!msgContent || this._initialSyncDone) {
                return;
            }
            this._loggerService.log(`Received message: ${msgContent}`);

            // Get defined door opener settings from the backend
            const doorOpenerSettings = DataService.appConfigs?.doorOpener;

            // Check if received message is up-to-date and if it includes the defined door opener command
            if (event?.getTs() > this._appStartTimestamp && msgContent.includes(doorOpenerSettings?.openCmd)) {
                this._loggerService.log(`Received command to open the door: ${msgContent}`);

                // Set the MQTT topic to open the door for a specified time
                SmartHomeService.setDoorOpenerActive(true);
                setTimeout(() => {
                    SmartHomeService.setDoorOpenerActive(false);
                }, (doorOpenerSettings?.timeoutSeconds || 1.5) * 1000);
            }
        });
    }

    async createCall(): Promise<void> {
        // Check if Matrix client is defined
        if (!this._matrixClient) {
            throw new Error("Matrix client is not defined");
        }

        // Check if room id is defined
        if (!this._configs?.roomOptions?.roomId) {
            throw new Error("Room ID is not defined");
        }

        // Creates the Matrix video call
        this._call = matrixcs.createNewMatrixCall(this._matrixClient, this._configs?.roomOptions?.roomId);

        // Check if Matrix video call is available
        if (!this._call) {
            throw new Error("Failed to create a new Matrix call");
        }

        // Sets start time of video call for reporting purposes
        this._callStartTime = Date.now();

        // Sets Matrix call event listerns
        this.addMatrixCallListeners(this._call);

        // Starts the Matrix video call
        await this._call.placeVideoCall();
    }

    addMatrixCallListeners(call: MatrixCall) {
        //Define listener to handle error event
        call.on(CallEvent.Error, (err) => {
            this._loggerService.error("Call error:", err.message);

            // Reset current screen and start timeout to switch screen
            ScreenService.setCallButtonState(false);
            SmartHomeService.setCallScreenTimeout(true);

            // Report call
            ReportService.reportCall(call, this._callStartTime)
            this._call = null;
        });

        // Define listener to handle a hang up event
        call.on(CallEvent.Hangup, (call: MatrixCall) => {
            this._loggerService.log("Call hangup. Reason = " + call.hangupReason)

            // Switch screen or start timeout to do so
            if (call.hangupReason === CallErrorCode.InviteTimeout || call.hangupReason === CallErrorCode.UserHangup) {
                ScreenService.showPage(CONST.PAGES.INTRO_SCREEN);
            }
            else {
                SmartHomeService.setCallScreenTimeout(true);
            }

            // Report call
            ReportService.reportCall(call, this._callStartTime);

            // Reset current screen
            setTimeout(() => ScreenService.setCallButtonState(false), 1000);
            this._call = null;
        });

        // Define listener to handle an established video call
        call.on(CallEvent.FeedsChanged, (feeds: CallFeed[]) => {
            this._loggerService.error("Call started. settings feeds...");

            // Set video feeds and current screen information
            ScreenService.setVideoCallFeeds(feeds);
            ScreenService.setCallButtonState(true);
            SmartHomeService.setCallScreenTimeout(false);
        });
    }

    async closeCall() {
        if (this._matrixClient && this._call) {
            this._call.hangup(CallErrorCode.UserHangup, false);
        }
    }

    public isCallActive() {
        return this._call === null ? false : true;
    }

    public onMatrixServerSet(callback: (status: string) => void) {
        this._eventEmitter.on('matrixServerSet', callback)
    }

    public onMatrixRoomSet(callback: (status: string) => void) {
        this._eventEmitter.on('matrixRoomSet', callback)
    }

    public onMatrixServerConnected(callback: (status: boolean) => void) {
        this._eventEmitter.on('matrixServerConnected', callback);
    }

    public onMatrixClientSyncSateChange(callback: (status: string) => void) {
        this._eventEmitter.on('matrixClientSyncStateChanged', callback)
    }
}

const MatrixService = MatrixServiceSingleton.getInstance();

export default MatrixService;