export interface Call {
    id: string;
    user_id: number;
    direction: string;
    started_at: object;
    ended_at: object;
    hang_up_party: string;
    hang_up_reason: string;
}