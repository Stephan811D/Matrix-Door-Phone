export default interface IMqttConfig {
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
        reconnectPeriod: number,
        tlsEnabled: boolean
    }
}