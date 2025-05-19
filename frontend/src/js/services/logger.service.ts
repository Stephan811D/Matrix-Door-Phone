import chalk from 'chalk';

export default class LoggerService {
    private _serviceName: string;
    private _backgroundColor: string;
    private _textColor: string;
    private _node: boolean | undefined;


    constructor(serviceName: string = "Service", backgroundColor: string = "#fff", textColor: string = "#000", node?: boolean) {
        this._serviceName = serviceName;
        this._backgroundColor = backgroundColor;
        this._textColor = textColor;
        this._node = node;
    }

    log(message: string | object | unknown) {
        let formattedMessage = '';

        if (typeof message === 'string') {
            formattedMessage = message;
        } else {
            try {
                formattedMessage = JSON.stringify(message, null, 2);
            } catch (error) {
                formattedMessage = "Could not convert object to JSON string: Circular structure";
            }
        }

        this.logMessage(formattedMessage);
    }

    error(errorMsg: string, error?: Error | unknown) {
        const formattedError = error instanceof Error ? `${error.name}: ${error.message}` : JSON.stringify(error, null, 2);
        this.logMessage(`${errorMsg} ${formattedError}`, 'error');
    }

    private logMessage(message: string, type: 'log' | 'error' = 'log') {
        if (!this._node) {
            console[type](
                `%c${this._serviceName}:` + `%c ${message}`,
                `background-color: ${this._backgroundColor}; color: ${this._textColor}; font-weight: bold;`,
                ""
            );
        }
        else {
            const chalkMethod = type === 'log' ? chalk.hex(this._textColor).bgHex(this._backgroundColor) : chalk.red;
            console[type](chalkMethod(`${this._serviceName}: ${message}`));
        }
    }
}