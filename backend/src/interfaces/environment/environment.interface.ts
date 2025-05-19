import IAppEnvironment from "./app-environment.interface";
import IMqttEnvironment from "./mqtt-environment.interface";
import IMatrixEnvironment from "./matrix-environment.interface";
import IDatabaseVariables from "./database.interface";
import IAuthenticationVariables from "./authentication.interface";
import IServerVariables from "./server.interface";

export default interface IEnvrionment {
    mode: string,

    server: {
        options: IServerVariables;
        database: IDatabaseVariables,
        authentication: IAuthenticationVariables
    },
    client:
    {
        app: IAppEnvironment,
        mqtt: IMqttEnvironment,
        matrix: IMatrixEnvironment
    }
}