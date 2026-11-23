/// <reference types="vite/client" />

declare module '*/api/claude.js' {
  import type { IncomingMessage, ServerResponse } from 'node:http';
  export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
