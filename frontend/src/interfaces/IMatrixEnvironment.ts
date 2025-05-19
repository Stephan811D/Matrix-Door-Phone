export default interface IMatrixEnvironment {
    serverName: string,
    username: string,
    password: string,
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