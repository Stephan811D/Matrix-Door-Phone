export default interface IMqttEnvironment {
    brokerName: string,
    brokerIp: string,
    brokerPort: number,
    user: string,
    password: string,
    protocol: string,
    clientOptions:
    {
        clientId: string,
        clean: boolean,
        connectTimeout: number,
        reconnectPeriod: number,
        tlsEnabled: boolean
    }
}