//Libs
import * as mqtt from 'mqtt';
import { EventEmitter } from 'eventemitter3';

//Services
import LoggerService from './logger.service';
import DataService from './data.service';

//Interfaces
import IMqttConfig from "../../interfaces/IMqttConfig";

class MqttServiceSingleton {
    private _loggerService;
    private static _instance: MqttServiceSingleton;

    private _configs: IMqttConfig | undefined = undefined
    private _client: mqtt.MqttClient | undefined = undefined;

    private _isConnected: boolean = false;
    private _eventEmitter: EventEmitter;

    constructor() {
        this._loggerService = new LoggerService("Mqtt-Service", "#00FFFF", "#000");
        this._eventEmitter = new EventEmitter();
        this._loggerService.log("Service initialized")
    }

    public static getInstance(): MqttServiceSingleton {
        if (!MqttServiceSingleton._instance) {
            MqttServiceSingleton._instance = new MqttServiceSingleton();
        }
        return MqttServiceSingleton._instance;
    }

    async initClient(): Promise<void> {
        // Load MQTT configuration from the DataService
        const configs = DataService.mqttConfigs;
        if (!configs) {
            throw new Error('MQTT configuration is missing or invalid');
        }

        // Set up connection MQTT connection URL
        const connectUrl = `${configs.protocol}://${configs.brokerIp}:${configs.brokerPort}/${configs.path}`;
        this._loggerService.log("Connection to MQTT server with url: " + connectUrl)

        // Create MQTT client with specified client options and emit event to notify DebugService
        const clientOptions = configs.clientOptions || undefined;
        this._client = mqtt.connect(connectUrl, clientOptions);
        this._eventEmitter.emit('mqttBrokerSet', configs.brokerName);

        // Setup event listeners for MQTT client
        this.setupEventListeners();

        // Set up MQTT event listeners and emit events to notify DebugService
        return new Promise((resolve, reject) => {
            // Define listener to handle connect event
            this._client?.on('connect', () => {
                this._loggerService.log("Connected to MQTT broker");
                this._isConnected = true;
                this._eventEmitter.emit('mqttBrokerConnected', this._isConnected);
                resolve();
            });

            // Define listerner to handle error during connection
            this._client?.on('error', (error) => {
                this._loggerService.error('MQTT connection error:', error);
                this._isConnected = false;
                this._eventEmitter.emit('mqttBrokerConnected', this._isConnected);
                reject(error);
            });
        });
    }

    private setupEventListeners(): void {
        // When the connection to MQTT broker is closed
        this._client?.on('close', () => {
            this._loggerService.log("Connection closed to MQTT broker");
            this._isConnected = false;
            this._eventEmitter.emit('mqttBrokerConnected', this._isConnected);
        });
    }

    subscribe(topic: string) {
        if (this._client) {
            this._client.subscribe(topic, (err) => {
                if (!err) {
                    this._loggerService.log(`Subscribed to topic: ${topic}`)
                }
            });
        }
    }

    publish(topic: string, message: string) {
        if (this._client) {
            this._client.publish(topic, message, (err) => {
                if (!err) {
                    this._loggerService.log(`Published message to topic: "${topic}" - message: "${message}"`);
                }
            });
        }
    }

    onMessage(callback: (topic: string, message: string) => void) {
        if (this._client) {
            this._client.on('message', (topic, message) => {
                callback(topic, message.toString());
            });
        }
    }

    disconnect() {
        if (this._client) {
            this._client.end();
            this._isConnected = false;
            this._eventEmitter.emit('mqttBrokerConnected', this._isConnected);
        }
    }

    public onMqttBrokerConnected(callback: (status: boolean) => void) {
        this._eventEmitter.on('mqttBrokerConnected', callback);
    }

    public onMqttBrokerSet(callback: (status: string) => void) {
        this._eventEmitter.on('mqttBrokerSet', callback)
    }
}

const MqttService = MqttServiceSingleton.getInstance();

export default MqttService;
