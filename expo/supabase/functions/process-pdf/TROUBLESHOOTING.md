# Troubleshooting TypeScript Errors in Edge Function

## If you see errors about `fetch`, `console`, or `Response`:

These are false positives from TypeScript. The code will work correctly when deployed to Supabase Edge Functions because:

1. **Deno Runtime**: Supabase Edge Functions run on Deno, which includes all Web APIs (`fetch`, `Response`, `console`) natively
2. **TypeScript Configuration**: The `tsconfig.json` includes `"lib": ["ES2020", "DOM", "DOM.Iterable"]` which provides these types
3. **Type Declarations**: The `deno.d.ts` file declares these globals

## To Fix IDE Errors:

### Option 1: Reload VS Code Window
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Reload Window"
3. Select "Developer: Reload Window"

### Option 2: Restart TypeScript Server
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "TypeScript: Restart TS Server"
3. Select it

### Option 3: Install Deno Extension
1. Install the "Deno" extension by denoland
2. The extension will automatically recognize Deno files and provide proper type checking

### Option 4: Verify Configuration
Make sure these files exist and are correct:
- `tsconfig.json` - Should include `"lib": ["ES2020", "DOM", "DOM.Iterable"]`
- `deno.d.ts` - Should declare `fetch`, `console`, `Response`, etc.
- `.vscode/settings.json` - Should have Deno settings

## Testing the Function

The function will work correctly when deployed, even if your IDE shows errors. To test:

1. Deploy: `supabase functions deploy process-pdf`
2. The function will run correctly in the Deno runtime
3. All Web APIs are available natively in Deno

## Note

These TypeScript errors are IDE-only issues. The code is correct and will work when deployed to Supabase Edge Functions.

