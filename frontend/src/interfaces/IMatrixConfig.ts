export default interface IMatrixConfig {
    serverName: string,
    clientOptions:
    {
        baseUrl: string,
        accessToken: string,
        userId: string,
        deviceId: string
    },
    roomOptions:
    {
        roomName: string,
        roomId: string
    }
}