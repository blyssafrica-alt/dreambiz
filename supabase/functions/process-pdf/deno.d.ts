// Deno type declarations for Supabase Edge Functions
// This file provides type definitions for Deno globals

declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
    export function set(key: string, value: string): void;
    export function has(key: string): boolean;
    export function delete(key: string): void;
    export function toObject(): Record<string, string>;
  }
}

