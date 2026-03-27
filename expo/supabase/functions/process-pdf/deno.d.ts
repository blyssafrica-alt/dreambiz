// Deno type declarations for Supabase Edge Functions
// This file provides type definitions for Deno globals and Web APIs

declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
    export function set(key: string, value: string): void;
    export function has(key: string): boolean;
    export function delete(key: string): void;
    export function toObject(): Record<string, string>;
  }
}

// Ensure Web API types are available
declare var fetch: typeof globalThis.fetch;
declare var console: typeof globalThis.console;
declare var Response: typeof globalThis.Response;
declare var Request: typeof globalThis.Request;
declare var Headers: typeof globalThis.Headers;

