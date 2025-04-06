// src/config.ts
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';

// Load .env file if exists
dotenv.config();

export function getApiKey(): string {
  // Check in order of priority:
  // 1. Environment variable
  // 2. Local .npmrc
  // 3. Global .npmrc
  // 4. package.json config


  const npmConfigKey = process.env.npm_config_skaya_api_key;
  if (npmConfigKey) return npmConfigKey;

  const packageConfigKey = process.env.npm_package_config_skaya_api_key;
  if (packageConfigKey) return packageConfigKey;

  // Check .npmrc files
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
    ChatGPT API key not found. Please configure it in one of these ways:

    1. Local .npmrc file:
       echo 'skaya_api_key=your_key_here' >> .npmrc
    
    2. Global npm config:
       npm config set skaya_api_key your_key_here
  `);
}