import CONST from '../../utils/constants';
import ScreenService from './screen.service';
import SmartHomeService from './smart-home.service';
import MatrixService from './matrix.service';
import MqttService from "./mqtt.service";
import EnvironmentService from './environment.service';

interface DomElements {
    appVersionElement: HTMLElement | null;

    screenList: NodeListOf<Element> | null;
    topicList: NodeListOf<Element> | null;
    mqttConnectionStateElement: HTMLElement | null;
    brokerIpElement: HTMLElement | null;

    matrixServerElement: HTMLElement | null;
    matrixRoomElement: HTMLElement | null;
    matrixConnectionStateElement: HTMLElement | null;
}

class DebugServiceSingelton {
    private static _instance: DebugServiceSingelton;
    private _enabled: boolean = false;

    private _domElements: DomElements;

    private _currentPageIndex: number | undefined = undefined;

    constructor() {
        this._domElements = {

            appVersionElement: null,

            screenList: null,
            topicList: null,
            mqttConnectionStateElement: null,
            brokerIpElement: null,

            matrixServerElement: null,
            matrixRoomElement: null,
            matrixConnectionStateElement: null,
        }
        this.initialize();
    }

    public static getInstance(): DebugServiceSingelton {
        if (!DebugServiceSingelton._instance) {
            DebugServiceSingelton._instance = new DebugServiceSingelton();
        }
        return DebugServiceSingelton._instance;
    }

    initialize() {
        this.getDomElements();
        this._enabled = EnvironmentService.getEnvironmentMode() === 'development' ? true : false;

        const debugButton = document.getElementById("debug-button");
        const debugMenu = document.getElementById("debug-menu");

        if (this._enabled) {
            debugButton?.classList.remove("d-none");
            debugMenu?.classList.remove("d-none");
        }

        window.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === "d") {
                debugButton?.classList.toggle("d-none");
                debugMenu?.classList.toggle("d-none")
            }
        });

        this.updateAppVersion(EnvironmentService.getAppVersion());
    }

    getDomElements() {
        this._domElements.appVersionElement = document.querySelector('#app-version');

        this._domElements.screenList = document.querySelectorAll('#debug-menu a.dropdown-item.screen');
        this._domElements.topicList = document.querySelectorAll('.state-info');
        this._domElements.mqttConnectionStateElement = document.querySelector('#mqtt-connection-state');
        this._domElements.brokerIpElement = document.querySelector('#broker-ip');

        this._domElements.matrixServerElement = document.querySelector('#matrix-server');
        this._domElements.matrixRoomElement = document.querySelector('#matrix-room');

        this._domElements.matrixConnectionStateElement = document.querySelector('#matrix-connection-state');
    }

    addEventListener() {
        if (this._domElements.screenList) {
            for (let i = 0; i < this._domElements.screenList.length; i++) {
                this._domElements.screenList[i].addEventListener('click', function (event) {
                    event.preventDefault();
                    let clickedElement = event.target as HTMLElement;
                    if (clickedElement && clickedElement.tagName === 'A') {
                        ScreenService.showPage(Number(clickedElement.getAttribute('data-id')))
                    }
                });
            }
        }
    }

    setListeners(): Promise<void> {

        return new Promise<void>((resolve) => {
            if (MqttService && SmartHomeService && MatrixService) {
                console.warn("setting listener")

                MqttService.onMqttBrokerSet(this.updateMqttBrokerInfoDebugMenu.bind(this));
                MqttService.onMqttBrokerConnected(this.updateMqttStateDebugMenu.bind(this));

                SmartHomeService.addChangeListener(this.updateTopicListDebugMenu.bind(this));

                MatrixService.onMatrixServerSet(this.updateMatrixServerDebugMenu.bind(this));
                MatrixService.onMatrixRoomSet(this.updateMatrixRoomDebugMenu.bind(this));
                MatrixService.onMatrixServerConnected(this.updateMatrixConnectedDebugMenu.bind(this));

                this.addEventListener();
                resolve();
            }
        })

    }

    updateAppVersion(version: string) {
        if (this._domElements && this._domElements.appVersionElement) {
            let appVersionElement = this._domElements.appVersionElement;

            if (appVersionElement) {
                appVersionElement.innerHTML = version === "" ? "not set" : version;
            }
        }
    }

    updateActivePageDebugMenu() {
        let screenElements = this._domElements.screenList;
        if (screenElements) {
            for (let i = 0; i < screenElements.length; i++) {
                screenElements[i].classList.remove("active");
                if (this._currentPageIndex === Number(screenElements[i].getAttribute('data-id'))) {
                    screenElements[i].classList.add("active");
                }
            }
        }
    }

    updateTopicListDebugMenu(key: string, value: any) {
        let topicElements = this._domElements.topicList;

        if (topicElements) {
            switch (key) {
                case CONST.TOPICS.PRESENCE.ID: topicElements[0].innerHTML = value; break;
                case CONST.TOPICS.DOORBELL.ID: topicElements[1].innerHTML = value; break;
                case CONST.TOPICS.DOOR.ID: topicElements[2].innerHTML = value; break;
                case CONST.TOPICS.DOOR_OPENER.ID: topicElements[3].innerHTML = value; break;
            }
        }
    }

    updateMqttStateDebugMenu(connected: boolean) {
        let mqttStateElement = this._domElements.mqttConnectionStateElement;

        if (mqttStateElement) {
            let state = connected ? "Connected" : "Disconnected";
            mqttStateElement.innerHTML = state;

            if (connected) {
                mqttStateElement.className = "badge rounded-pill bg-success";
            }
            else {
                mqttStateElement.className = "badge rounded-pill bg-danger";
            }
        }
    }

    updateMqttBrokerInfoDebugMenu(brokerIp: string) {
        if (this._domElements && this._domElements.brokerIpElement) {
            let brokerIpElement = this._domElements.brokerIpElement;

            if (brokerIpElement) {
                brokerIpElement.innerHTML = brokerIp === "" ? "not set" : brokerIp;
            }
        }
    }

    updateMatrixServerDebugMenu(server: string) {
        if (this._domElements && this._domElements.matrixServerElement) {
            let matrixServerElement = this._domElements.matrixServerElement;

            if (matrixServerElement) {
                matrixServerElement.innerHTML = server === "" ? "not set" : server;
            }
        }
    }

    updateMatrixRoomDebugMenu(room: string) {
        if (this._domElements && this._domElements.matrixRoomElement) {
            let matrixRoomElement = this._domElements.matrixRoomElement;

            if (matrixRoomElement) {
                matrixRoomElement.innerHTML = room === "" ? "not set" : room;
            }
        }
    }

    updateMatrixConnectedDebugMenu(connected: boolean) {
        if (this._domElements && this._domElements.matrixConnectionStateElement) {
            let matrixConnectedElement = this._domElements.matrixConnectionStateElement;

            if (matrixConnectedElement) {
                let state = connected ? "Connected" : "Disconnected";
                matrixConnectedElement.innerHTML = state;

                if (connected) {
                    matrixConnectedElement.className = "badge rounded-pill bg-success";
                }
                else {
                    matrixConnectedElement.className = "badge rounded-pill bg-danger";
                }
            }
        }
    }

    set currentPageIndex(page: number) {
        this._currentPageIndex = page;
    }
}

const DebugService = DebugServiceSingelton.getInstance();

export default DebugService;