//Libs
import { CallFeed } from 'matrix-js-sdk/lib/webrtc/callFeed';

//Services
import LoggerService from './logger.service';
import DebugService from "./debug.service";
import MatrixService from './matrix.service';
import SmartHomeService from './smart-home.service';
import DataService from './data.service';
import ReportService from './report.service';

//Interfaces & Types
import { MagicLinkResponsePayload } from '../../interfaces/IDataService'

class ScreenServiceSingleton {
    private _loggerService: LoggerService;
    private static _instance: ScreenServiceSingleton;

    private _screens: any | null;
    private _currentPageIndex: number;

    private _domElements: {
        callButton: HTMLElement | null,
        hangUpButton: HTMLElement | null
    } | undefined;

    private _themeSettings: {
        startDarkMode: string | undefined,
        endDarkMode: string | undefined
    } | undefined;

    constructor() {
        this._loggerService = new LoggerService("Screen-Service", "#fa23b6", "#000");
        this._currentPageIndex = 0;

        this.getScreenDomElements();
        this.getDomElements();

        this._loggerService.log("Service initialized")
    }

    public static getInstance(): ScreenServiceSingleton {
        if (!ScreenServiceSingleton._instance) {
            ScreenServiceSingleton._instance = new ScreenServiceSingleton();
        }
        return ScreenServiceSingleton._instance;
    }

    public async initScreens() {
        const houseOwner = DataService.appConfigs?.houseOwner;
        const callUser = DataService.appConfigs?.callUser;

        await this.getDarkModeTimes();

        ScreenService.setIntroScreenData(houseOwner);
        ScreenService.setCallScreenData(callUser);
        ScreenService.addButtonListener();

        this.setThemeMode();
        setInterval(() => this.setThemeMode(), 15000);
    }

    getScreenDomElements() {
        this._screens = document.querySelectorAll('div.screen');
    }

    getDomElements() {
        this._domElements = {
            callButton: document.getElementById('call-button'),
            hangUpButton: document.getElementById('hang-up-button')
        }
    }

    private async getDarkModeTimes() {
        this._themeSettings = DataService?.appConfigs?.theme;
        if (!this._themeSettings) {
            throw new Error('App configuration is missing or invalid');
        }
    }

    showPage(index: number, init: boolean = false) {
        const currentElement = this._screens[this._currentPageIndex] as HTMLElement;
        const targetElement = this._screens[index] as HTMLElement;

        if (init) {
            currentElement.style.display = "block";
            currentElement.style.left = "0px";
            currentElement.style.opacity = "1";
            this._currentPageIndex = index;
        }
        else {
            if (this._currentPageIndex !== index) {
                currentElement.style.opacity = '0';
                currentElement.style.left = '-480px';

                targetElement.style.opacity = "1";
                targetElement.style.display = 'block';
                targetElement.style.left = '480px';

                this._currentPageIndex = index;
                DebugService.currentPageIndex = this._currentPageIndex;
                DebugService.updateActivePageDebugMenu();

                setTimeout(() => {
                    currentElement.style.display = 'none';
                    targetElement.style.opacity = '1';
                    targetElement.style.left = '0';
                }, 150);
            }
        }

        if (MatrixService.isCallActive()) {
            MatrixService.closeCall();
        }
    }

    setAuthenticationScreenData(data: MagicLinkResponsePayload) {
        const verificationHeadingElement: HTMLElement | null = document.getElementById('verification-heading');
        const verificationStateElement: HTMLElement | null = document.getElementById('verification-state');
        const verificationCodeElement: HTMLElement | null = document.getElementById('verification-code');
        const verificationTimeElement: HTMLElement | null = document.getElementById('verification-time');
        const reloadAppButton: HTMLElement | null = document.getElementById('reload-app');

        if (verificationHeadingElement && verificationStateElement && verificationCodeElement && verificationTimeElement && reloadAppButton) {
            verificationCodeElement.innerHTML = data.verificationNumber.toString();;

            let verficationTtlSeconds: number = data.ttl_min * 60;

            this.setVerificationTime(verificationTimeElement, verficationTtlSeconds)

            const verificationInterval = setInterval(() => {
                verficationTtlSeconds -= 1;

                this.setVerificationTime(verificationTimeElement, verficationTtlSeconds)

                if (verficationTtlSeconds <= 0) {
                    clearInterval(verificationInterval);
                    verificationHeadingElement.innerHTML = "Authentication process failed!"
                    verificationStateElement.style.display = "none";
                    reloadAppButton.style.display = 'block';
                }
            }, 1000);
        }
    }

    setVerificationTime(element: HTMLElement, time: number) {
        let verficationTtlText: string;

        verficationTtlText = time > 1 ? "Seconds" : "Second";
        element.innerHTML = `${time} ${verficationTtlText}`
    }

    private setIntroScreenData(houseOwner: string | undefined) {
        const houseOwnerElement: HTMLElement | null = document.getElementById('house-owner');
        if (houseOwnerElement) {
            if (houseOwner) {
                houseOwnerElement.innerHTML = houseOwner;
            }
        }
    }

    private setCallScreenData(user: string | undefined) {
        const matrixUserElement: HTMLElement | null = document.getElementById('recipient-name');
        if (matrixUserElement) {
            if (user) {
                matrixUserElement.innerHTML = user;
            }
        }
    }

    public setErrorScreenMessage(message: unknown | Error | string | undefined) {
        const errorMessageElement: HTMLElement | null = document.getElementById('error-message')
        if (errorMessageElement) {
            if (message) {
                if (message instanceof Error) {
                    console.log(message.message)
                }
                errorMessageElement.innerHTML = message.toString();
            }
        }
    }

    public setVideoCallFeeds(feeds: CallFeed[]) {
        // Retrive local and remote video feeds
        const localFeed = feeds.find((feed) => feed.isLocal());
        const remoteFeed = feeds.find((feed) => !feed.isLocal());

        // Get HTML DOM elements
        const localFeedElement = document.getElementById('local-video') as HTMLVideoElement;
        const remoteFeedElement = document.getElementById('remote-video') as HTMLVideoElement;

        // Set feeds to HTML elements and mute local feed
        if (localFeed && localFeedElement) {
            localFeedElement.muted = true;
            localFeedElement.srcObject = localFeed.stream;
            localFeedElement.play();
        }
        if (remoteFeed && remoteFeedElement) {
            remoteFeedElement.srcObject = remoteFeed.stream;
            remoteFeedElement.play();
        }
    }

    private addButtonListener() {
        const ringButton = document.getElementById('ring-button');

        if (ringButton) {
            ringButton.addEventListener('click', () => {
                SmartHomeService.handleRing();
                ReportService.reportVisitorInput('INIT_RING');
            });
        }

        if (this._domElements?.callButton) {
            this._domElements?.callButton.addEventListener('click', async () => {
                await MatrixService.createCall();
                ReportService.reportVisitorInput('START_CALL');
            });
        }

        if (this._domElements?.hangUpButton) {
            this._domElements?.hangUpButton?.addEventListener('click', async () => {
                await MatrixService.closeCall();
                ReportService.reportVisitorInput('HANG_UP_CALL');
            });
        }
    }

    public setCallButtonState(isCallActive: boolean) {
        if (this._domElements?.callButton && this._domElements?.hangUpButton) {
            this._domElements.callButton.classList.remove('d-none');
            this._domElements.callButton.classList.remove('d-block');
            this._domElements.hangUpButton.classList.remove('d-none');
            this._domElements.hangUpButton.classList.remove('d-block');

            if (isCallActive) {
                this._domElements.callButton.classList.add('d-none');
                this._domElements.hangUpButton.classList.add('d-block');
            } else {
                this._domElements.callButton.classList.add('d-block');
                this._domElements.hangUpButton.classList.add('d-none');
            }
        }
    }

    private setThemeMode() {
        const now = new Date();
        const currentHour = now.getHours() * 60 + now.getMinutes();
        const start = this._themeSettings?.startDarkMode || '21:00';
        const end = this._themeSettings?.endDarkMode || '07:30';

        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);

        const [startTime, endTime] = [startHour * 60 + startMinute, endHour * 60 + endMinute];

        const isWithinRange =
            (startTime < endTime && currentHour >= startTime && currentHour < endTime) ||
            (startTime > endTime && (currentHour >= startTime || currentHour < endTime));

        const htmlElement = document.querySelector('html');

        if (htmlElement) {
            htmlElement.setAttribute('data-bs-theme', isWithinRange ? 'dark' : 'light');
            this._loggerService.log(
                `Theme set to '${isWithinRange ? 'dark' : 'light'}' from ${start} to ${end}`
            );
        } else {
            this._loggerService.log("HTML element not found.");
        }
    }
}

const ScreenService = ScreenServiceSingleton.getInstance();

export default ScreenService;