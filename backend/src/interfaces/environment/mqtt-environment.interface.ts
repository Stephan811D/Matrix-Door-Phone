export default interface IMqttEnvironment {
    brokerName: string,
    brokerIp: string,
    brokerPort: number,
    protocol: string,
    path: string,
    clientOptions:
    {
        username: string,
        password: string,
        clientId: string,
        clean: boolean,
        connectTimeout: number,
        reconnectPeriod: number
    }
}