/**
 * Handles CLI errors consistently
 */
export function handleCliError(error: Error, context: string): void {
    console.error(`❌ Error in ${context}: ${error.message}`);
    process.exitCode = 1;
  }