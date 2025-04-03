import OpenAI from "openai";
import { readFileSync } from 'fs';
import path from 'path';
import { ComponentType } from '../../bin/types/enums';
import * as dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.openAiApiKey });

// Interface for component generation options
interface ComponentGenerationOptions {
  style: 'css' | 'scss' | 'styled-components' | 'none';
  typescript: boolean;
  withProps?: boolean;
  withState?: boolean;
  withEffects?: boolean;
}

export async function generateCodeWithAI(
  fileName: string,
  projectType:string,
  componentType: ComponentType,
  description: string = '',
  options: ComponentGenerationOptions = { 
    style: 'css', 
    typescript: true,
    withProps: true,
    withState: false,
    withEffects: false,
  }
): Promise<{ code: string; dependencies: string[] }> {
  
  // Read the template file
  const templatePath = path.join(__dirname, `../templates/frontendTemplates/component.jsx`);
  const promptTemplate = readFileSync(templatePath, 'utf-8');

  // Prepare the instructions for the AI
  const instructions = [
    `Generate a ${componentType} React component named ${fileName}`,
    `Description: ${description || 'No description provided'}`,
    `Using: ${options.typescript ? 'TypeScript' : 'JavaScript'}`,
    `Styling method: ${options.style}`,
    options.withProps ? 'Include props interface/validation' : 'No props needed',
    options.withState ? 'Include state management' : 'No state needed',
    options.withEffects ? 'Include side effects' : 'No effects needed',
  ].join('\n- ');

  // Replace placeholders in the template
  const prompt = promptTemplate
    .replace(/COMPONENT_NAME/g, fileName)
    .replace('AI_GENERATED_DESCRIPTION', description)
    .replace('{{INSTRUCTIONS}}', instructions)
    .replace('{{STYLE_EXTENSION}}', options.style)
    .replace('{{TYPESCRIPT}}', options.typescript ? 'true' : 'false');

  // Generate the component with AI
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: `You are an expert React developer. Generate clean, production-ready code that:
      - Follows best practices
      - Includes proper TypeScript types (if enabled)
      - Uses the specified styling method
      - Has clear, concise comments
      - Is fully functional`
    }, {
      role: 'user',
      content: prompt
    }],
    temperature: 0.5, // Lower temperature for more deterministic output
    max_tokens: 2000
  });

  // Extract dependencies based on the options
  const dependencies = [];
  if (options.style === 'styled-components') {
    dependencies.push('styled-components');
  }
  if (options.typescript) {
    dependencies.push('@types/react');
  }

  return {
    code: response.choices[0]?.message?.content || '',
    dependencies
  };
}