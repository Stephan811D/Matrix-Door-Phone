export default interface IServerVariables {
    port: number;
    https: boolean;
    allowedCorsOrigins: string;
    allowedRequestOrigins: string;
}