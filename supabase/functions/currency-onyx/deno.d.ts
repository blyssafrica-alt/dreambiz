/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
}

declare const fetch: typeof globalThis.fetch;
declare const console: typeof globalThis.console;
declare const Response: typeof globalThis.Response;
declare const Request: typeof globalThis.Request;
declare const Headers: typeof globalThis.Headers;

