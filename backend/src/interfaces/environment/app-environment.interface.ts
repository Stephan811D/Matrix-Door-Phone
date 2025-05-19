export default interface IAppEnvironment {
    callUser: string,
    houseOwner: string,
    timeouts: {
        callScreenTimeoutSeconds: number,
        ringScreenTimeoutSeconds: number,
        doorScreenTimeoutSeconds: number
    },
    theme: {
        startDarkMode: string,
        endDarkMode: string
    },
    doorOpener: {
        openCmd: string;
        timeoutSeconds: number;
    }
}