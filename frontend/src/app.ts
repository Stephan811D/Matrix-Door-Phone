//Libs
import * as bootstrap from 'bootstrap'

//Environment
import * as dotenv from 'dotenv';
dotenv.config();

//Constants
import CONST from './utils/constants';

//Services
import LoggerService from './js/services/logger.service.js';
import DebugService from './js/services/debug.service.js';
import DataService from "./js/services/data.service.js";
import ScreenService from "./js/services/screen.service.js";
import MatrixService from './js/services/matrix.service.js';
import SmartHomeState from './js/services/smart-home.service.js';
import ReportService from './js/services/report.service.js';
import EnvironmentService from './js/services/environment.service';

//Bootstrap
const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
Array.from(dropdownElementList).map(dropdownToggleEl => new bootstrap.Dropdown(dropdownToggleEl));

const logger = new LoggerService("Application", "#a200ff", "#fff");

const initFrontend = async () => {
    try {
        // Show loading screen to inform user the application is starting up
        ScreenService.showPage(CONST.PAGES.LOADING_SCREEN, true);

        // Load environment variables for the app configuration
        await EnvironmentService.init();
        logger.log("Loaded environment variables");

        // Initialize essential services required for the application
        await DebugService.setListeners();
        await DataService.init();
        await DataService.getConfigs();
        await ScreenService.initScreens();
        await ReportService.init();
        logger.log("Initiated servies");

        // Initialize clients for external services
        await SmartHomeState.initMqttClient();
        await MatrixService.initClient();
        logger.log("Started clients");

        // Display intro screen once all necessary preparations are complete
        ScreenService.showPage(CONST.PAGES.INTRO_SCREEN);
    } catch (error) {
        // Handle errors that occur during app initialization.
        logger.error('Error during app initialization:', error);
        ScreenService.setErrorScreenMessage(error)
        ScreenService.showPage(CONST.PAGES.ERROR_SCEEN);
    }
}

initFrontend();

//TODO: Cleanup Screen-Service