export default interface IMatrixEnvironment {
    serverName: string,
    clientOptions:
    {
        baseUrl: string,
        accessToken: string,
        userId: string,
        //deviceId: string
    },
    roomOptions:
    {
        roomName: string,
        roomId: string
    }
}