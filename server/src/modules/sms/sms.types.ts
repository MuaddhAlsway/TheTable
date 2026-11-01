export class GatewayError extends Error { constructor(public code: string, public retryable = true) { super(code); } }
export type GatewayMessage = { id: string; state: string };
