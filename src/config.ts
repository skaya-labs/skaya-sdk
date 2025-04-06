// src/config.ts
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';

// Load .env file if exists
dotenv.config();

// src/config.ts
export function getApiKey(): string {
  // Check environment variable first
  const envKey = process.env.SKAYA_API_KEY;
  if (envKey) return envKey;

  // Then check .npmrc files
  const checkNpmrc = (filePath: string): string | undefined => {
    if (existsSync(filePath)) {
      const npmrc = readFileSync(filePath, 'utf-8');
      const match = npmrc.match(/skaya_api_key\s*=\s*(.+)/);
      return match?.[1]?.trim();
    }
  };

  const localNpmrcKey = checkNpmrc(path.join(process.cwd(), '.npmrc'));
  if (localNpmrcKey) return localNpmrcKey;

  const globalNpmrcKey = checkNpmrc(path.join(homedir(), '.npmrc'));
  if (globalNpmrcKey) return globalNpmrcKey;

  throw new Error(`
    API key not found. Please configure it in one of these ways:

    1. Environment variable (recommended):
       export SKAYA_API_KEY=your_key_here

    2. Local .npmrc file:
       echo 'skaya_api_key=your_key_here' >> .npmrc
  `);
}