export function toMySqlTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const pad = (number: number) => (number < 10 ? `0${number}` : number);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}