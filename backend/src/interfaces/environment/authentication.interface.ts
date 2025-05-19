export default interface IAuthenticationVariables {
    magicLink: {
        baseUrl: string,
        baseUrlPort: number,
        ttlMin: number,
        secret: string,
    }
    session: {
        ttlMin: number,
        secret: string,
    },
    cookie: {
        ttlDays: number,
        secret: string,
    },
    matrixClient:
    {
        serverName: string,
        clientOptions: {
            baseUrl: string,
            accessToken: string,
            userId: string,
            deviceId: string,
        },
        roomOptions: {
            roomName: string,
            roomId: string
        }
    }
}