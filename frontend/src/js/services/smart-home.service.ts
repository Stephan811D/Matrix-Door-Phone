//Libs
import { EventEmitter } from 'eventemitter3';

//Servies
import LoggerService from "./logger.service";
import MqttService from "./mqtt.service";
import MatrixService from './matrix.service';
import ScreenService from './screen.service';
import DataService from './data.service';

//Interfaces
import IAppEnvironment from '../../interfaces/IAppEnvironment';

//Constants
import CONST from '../../utils/constants.js';

//Types
import { PresenceState, DoorBellState, DoorState, DoorOpenerState } from '../../types/states.types'

class SmartHomeServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: SmartHomeServiceSingleton;

    private _presenceState: PresenceState | undefined;
    private _doorBellState: DoorBellState | undefined;
    private _doorState: DoorState | undefined;
    private _doorOpenerState: DoorOpenerState | undefined;

    private _eventEmitter: EventEmitter;

    private _isInit: boolean;
    private _appTimeoutConfigs: {
        callScreenTimeoutSeconds: number,
        ringScreenTimeoutSeconds: number,
        doorScreenTimeoutSeconds: number
    } | undefined;

    private _processStates: {
        ringScreenTimeout: NodeJS.Timeout | undefined;
        doorScreenTimeout: NodeJS.Timeout | undefined;
        callScreenTimeout: NodeJS.Timeout | undefined;
        doorOpened: boolean;
    };

    constructor() {
        this._loggerService = new LoggerService("Smart-Home", "#ff8400", "#000");
        this._eventEmitter = new EventEmitter();

        this._isInit = true;

        this._processStates = {
            ringScreenTimeout: undefined,
            doorScreenTimeout: undefined,
            doorOpened: false,
            callScreenTimeout: undefined
        };

        this._loggerService.log("Service initialized")
    }

    public static getInstance(): SmartHomeServiceSingleton {
        if (!SmartHomeServiceSingleton._instance) {
            SmartHomeServiceSingleton._instance = new SmartHomeServiceSingleton();
        }
        return SmartHomeServiceSingleton._instance;
    }

    private async loadAppConfig(): Promise<IAppEnvironment> {
        const configs = DataService.appConfigs;
        if (!configs) {
            throw new Error('App configuration is missing or invalid');
        }
        return configs;
    }

    async initMqttClient(): Promise<void> {
        try {
            this._appTimeoutConfigs = (await this.loadAppConfig()).timeouts;
            await MqttService.initClient();

            this.subscribeTopics();
            this.listenToTopics();
        } catch (error) {
            throw error;
        }
    }

    private subscribeTopics() {
        const topics = Object.values(CONST.TOPICS).map(topic => topic.TOPIC_NAME);
        topics.forEach(topic => MqttService!.subscribe(topic));
    }

    public publish(topic: string, message: string | number): void {
        MqttService.publish(topic, message.toString());
    }

    private listenToTopics() {
        MqttService.onMessage((topic: string, message: string) => {
            try {
                this.updateState(topic, message);
            } catch (error) {
                this._loggerService.error('Error while processing message:', error);
            }
        });
    }

    async updateState(topic: string, value: string) {
        this._loggerService.log(`Received message on topic "${topic}": ${value}`);

        switch (topic) {
            case CONST.TOPICS.PRESENCE.TOPIC_NAME:
                this._presenceState = this.parsePresenceState(value);
                this.emitChange<PresenceState>(CONST.TOPICS.PRESENCE.ID, this._presenceState);
                break;
            case CONST.TOPICS.DOORBELL.TOPIC_NAME:
                this._doorBellState = this.parseDoorBellState(value);
                this.emitChange<DoorBellState>(CONST.TOPICS.DOORBELL.ID, this._doorBellState);
                break;
            case CONST.TOPICS.DOOR.TOPIC_NAME:
                this._doorState = this.parseDoorState(value);
                this.emitChange<DoorState>(CONST.TOPICS.DOOR.ID, this._doorState);

                if (!this._isInit && this._doorState === 'open' && !MatrixService.isCallActive()) {
                    ScreenService.showPage(CONST.PAGES.DOOR_SCREEN);
                    this.setDoorScreenTimeout(true);
                }
                this._processStates.doorOpened = true;
                this._isInit = false;
                break;
            case CONST.TOPICS.DOOR_OPENER.TOPIC_NAME:
                this._doorOpenerState = this.parseDoorOpenerState(value);
                this.emitChange<DoorOpenerState>(CONST.TOPICS.DOOR_OPENER.ID, this._doorOpenerState);
                break;
            default:
                this._loggerService.error(`Topic not defined`);
                throw Error('Topic not found');
        }
    }

    setDoorBellStateActive(state: boolean) {
        const doorBellState = state ? 'active' : 'inactive';
        this.publish(CONST.TOPICS.DOORBELL.TOPIC_NAME, doorBellState);
    }

    setDoorOpenerActive(state: boolean) {
        const doorOpenerState = state ? 1 : 0;
        this.publish(CONST.TOPICS.DOOR_OPENER.TOPIC_NAME, doorOpenerState);
    }

    parsePresenceState(value: string | undefined): PresenceState {
        const validStates: PresenceState[] = ['null', 'person1', 'person2', 'person1, person2'];
        if (typeof value === 'string' && validStates.includes(value as PresenceState)) {
            return value as PresenceState;
        } else {
            throw new Error(`Invalid presence state: ${value}`);
        }
    }

    parseDoorBellState(value: string | undefined): DoorBellState {
        const validStates: DoorBellState[] = ['active', 'inactive'];
        if (typeof value === 'string' && validStates.includes(value as DoorBellState)) {
            return value as DoorBellState;
        } else {
            throw new Error(`Invalid doorbell state: ${value}`);
        }
    }

    parseDoorState(value: string | undefined): DoorState {
        const validStates: DoorState[] = ['open', 'closed'];
        if (typeof value === 'string' && validStates.includes(value as DoorState)) {
            return value as DoorState;
        } else {
            throw new Error(`Invalid door state: ${value}`);
        }
    }

    parseDoorOpenerState(value: string | undefined): DoorOpenerState {
        const validStates: DoorOpenerState[] = ['0', '1'];
        if (typeof value === 'string' && validStates.includes(value as DoorOpenerState)) {
            return value as DoorOpenerState;
        } else {
            throw new Error(`Invalid doorOpener state: ${value}`)
        }
    }

    getPresenceState(): PresenceState | undefined {
        this._loggerService.log(`Reading current presence state: ${this._presenceState}`);
        return this._presenceState;
    }

    getDoorBellState(): DoorBellState | undefined {
        this._loggerService.log(`Reading current door bell state: ${this._doorBellState}`);
        return this._doorBellState;
    }

    getDoorState(): DoorState | undefined {
        this._loggerService.log(`Reading current door state: ${this._doorState}`);
        return this._doorState;
    }

    private setDoorScreenTimeout(active: boolean) {
        if (active && this._appTimeoutConfigs?.doorScreenTimeoutSeconds) {
            clearTimeout(this._processStates?.doorScreenTimeout);
            this._processStates.doorScreenTimeout = setTimeout(() => {
                ScreenService.showPage(CONST.PAGES.INTRO_SCREEN);
            }, this._appTimeoutConfigs.doorScreenTimeoutSeconds * 1000);
        } else {
            clearTimeout(this._processStates?.doorScreenTimeout);
        }
    }

    public setCallScreenTimeout(active: boolean) {
        if (active && this._appTimeoutConfigs?.callScreenTimeoutSeconds) {
            clearTimeout(this._processStates?.callScreenTimeout);
            this._processStates.callScreenTimeout = setTimeout(() => {
                ScreenService.showPage(CONST.PAGES.INTRO_SCREEN);
            }, this._appTimeoutConfigs?.callScreenTimeoutSeconds * 1000);

        } else {
            clearTimeout(this._processStates?.callScreenTimeout);
        }
    }

    public async handleRing() {
        // Reset current ring states and timeouts
        this.resetStates();

        // Verifiy if somebody is currently at home. If not start Matrix video call
        if (this.getPresenceState() === 'null') {
            this._loggerService.log("No person present: starting call")
            this.initiateMatrixCall();
        }
        else {
            this._loggerService.log("At least one person at home: ringing door bell");

            if (this._appTimeoutConfigs?.ringScreenTimeoutSeconds) {
                // Show ringing screen and set door bell state via MQTT topic to active
                ScreenService.showPage(CONST.PAGES.RING_SCREEN);
                this.setDoorBellStateActive(true);

                // Specify and wait for configured time to reset door bell state
                const doorBellTimeoutPromise = new Promise<void>((resolve) => {
                    const timeoutId = setTimeout(() => {
                        clearTimeout(timeoutId);
                        resolve();
                    }, (this._appTimeoutConfigs?.ringScreenTimeoutSeconds || 10) * 1000);
                });
                await doorBellTimeoutPromise;
                this.setDoorBellStateActive(false);

                // When door was not opened within configured time start Matrix video call otherwise show intro screen
                if (this._processStates.doorOpened === false) {
                    this._loggerService.log("Door was not opened within timeout: starting call")
                    this.initiateMatrixCall();
                }
                else {
                    this._loggerService.log("Door was opened within timeout")
                    ScreenService.showPage(CONST.PAGES.INTRO_SCREEN);
                }
            }
        }
    }

    private resetStates() {
        this._processStates.doorOpened = false;
        clearTimeout(this._processStates.ringScreenTimeout);
        clearTimeout(this._processStates.doorScreenTimeout);
    }

    public initiateMatrixCall() {
        ScreenService.setCallButtonState(true);
        ScreenService.showPage(CONST.PAGES.CALL_SCREEN);
        MatrixService.createCall();
    }

    public getCurrentSmartHomeState() {
        return {
            presenceState: this._presenceState,
            doorBellState: this._doorBellState,
            doorState: this._doorState,
        }
    }

    private emitChange<T>(key: string, value: T) {
        this._eventEmitter.emit('change', key, value);
    }

    public addChangeListener<T>(listener: (key: string, value: T) => void) {
        this._eventEmitter.addListener('change', listener);
    }

    public removeChangeListener<T>(listener: (key: string, value: T) => void) {
        this._eventEmitter.removeListener('change', listener);
    }
}

const SmartHomeService = SmartHomeServiceSingleton.getInstance();

export default SmartHomeService;