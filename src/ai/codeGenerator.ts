import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from '../../bin/types/enums';
import inquirer from "inquirer";
import { getTemplateFilesForType } from "../scripts/template";

interface ComponentFile {
  fileName: string;
  content: string;
}

interface AIComponentGenerationResult {
  files: ComponentFile[];
  dependencies: string[];
}

interface ComponentGenerationOptions {
  style: 'css' | 'scss' | 'styled-components' | 'none';
  typescript: boolean;
  withProps?: boolean;
  withState?: boolean;
  withEffects?: boolean;
  withTests?: boolean;
  withStories?: boolean;
}

export async function generateCodeWithAI(
  fileName: string,
  projectType: ProjectType,
  componentType: ComponentType,
  description: string = '',
  options: ComponentGenerationOptions = { 
    style: 'css', 
    typescript: true,
    withProps: true,
    withState: false,
    withEffects: false,
    withTests: true,
    withStories: projectType === ProjectType.FRONTEND
  }
): Promise<AIComponentGenerationResult> {
  const { apiKey } = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter your OpenAI API key:',
      validate: (apiKey) => !!apiKey || 'API key is required.'
    },
  ]);

  if (!apiKey) {
    throw new Error('API key is required.');
  }

  const openai = new OpenAI({ apiKey });

  // Get all required files for this component type
  const requiredFiles = getTemplateFilesForType(componentType);
  const generatedFiles: ComponentFile[] = [];
  const dependencies: string[] = [];

  // Base configuration for all files
  const baseConfig = {
    componentName: fileName,
    description,
    projectType,
    componentType,
    ...options
  };

  // Generate each required file
  for (const fileTemplate of requiredFiles) {
    const fileType = path.extname(fileTemplate).replace('.', '');
    const templatePath = path.join(__dirname, `../templates/ai/${fileType}.prompt`);
    
    if (!existsSync(templatePath)) {
      console.warn(`No AI prompt template found for ${fileType} files`);
      continue;
    }

    const promptTemplate = readFileSync(templatePath, 'utf-8');
    const filePrompt = buildFilePrompt(promptTemplate, baseConfig, fileTemplate);

    const response = await generateWithAI(openai, filePrompt, fileType);
    
    if (response) {
      generatedFiles.push({
        fileName: fileTemplate.replace(/Component/g, fileName),
        content: response
      });
    }
  }

  // Add dependencies based on options
  if (options.style === 'styled-components') {
    dependencies.push('styled-components');
  }
  if (options.typescript) {
    dependencies.push('@types/react');
    dependencies.push('@types/jest');
  }
  if (options.withTests) {
    dependencies.push('@testing-library/react');
  }
  if (options.withStories) {
    dependencies.push('@storybook/react');
  }

  return {
    files: generatedFiles,
    dependencies: [...new Set(dependencies)] // Remove duplicates
  };
}

async function generateWithAI(openai: OpenAI, prompt: string, fileType: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: getSystemPrompt(fileType)
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.3, // Lower temperature for more consistent output
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error(`Error generating ${fileType} file:`, error);
    return '';
  }
}

function getSystemPrompt(fileType: string, componentType?: ComponentType): string {
  const basePrompt = `You are an expert full-stack developer. Generate clean, production-ready code that:
- Follows best practices for the specific file type
- Includes proper TypeScript types
- Has clear, concise comments where needed
- Is fully functional
- Matches modern architectural patterns
- Uses appropriate error handling
- Follows security best practices`;

  // Handle file extensions first
  switch (fileType) {
    case 'tsx':
      return componentType === FrontendComponentType.PAGE 
        ? `${basePrompt} for Next.js/Nuxt page components. Include:
           - Proper page-level structure
           - SEO considerations if applicable
           - Data fetching methods if needed
           - Layout integration`
        : `${basePrompt} for React components. Include:
           - Proper component structure
           - TypeScript interfaces
           - Clean JSX
           - Accessibility best practices`;

    case 'test.tsx':
      return `${basePrompt} for React component tests. Include:
              - Testing Library best practices
              - Meaningful test cases
              - Proper mocking where needed
              - Accessibility tests`;

    case 'stories.tsx':
      return `${basePrompt} for Storybook stories. Include:
              - Comprehensive controls
              - Multiple interaction states
              - Documentation`;

    case 'css':
    case 'scss':
      return `${basePrompt} for styles. Include:
              - Modular CSS patterns
              - Responsive design considerations
              - BEM naming if appropriate
              - Variables for theming`;

    case 'test.ts':
      return `${basePrompt} for backend tests. Include:
              - Unit tests for business logic
              - Integration tests for APIs
              - Proper test setup/teardown
              - Mocking of external services`;

    case 'ts':
      // Handle backend-specific component types
      if (componentType) {
        switch (componentType) {

          case BackendComponentType.ROUTE:
            return `${basePrompt} for API routes. Include:
                    - RESTful design principles
                    - Proper HTTP status codes
                    - Input validation
                    - Error handling
                    - Documentation`;

          case BackendComponentType.CONTROLLER:
            return `${basePrompt} for backend controllers. Include:
                    - Business logic encapsulation
                    - Clean separation of concerns
                    - Proper error handling
                    - Type-safe inputs/outputs
                    - Dependency injection`;

          default:
            return `${basePrompt} for general TypeScript files`;
        }
      }
      return `${basePrompt} for general TypeScript files`;

    default:
      return basePrompt;
  }
}
function buildFilePrompt(
  template: string,
  config: Record<string, any>,
  originalFileName: string
): string {
  const replacements = {
    'COMPONENT_NAME': config.componentName,
    'COMPONENT_TYPE': config.componentType,
    'DESCRIPTION': config.description,
    'PROJECT_TYPE': config.projectType,
    'STYLE_EXTENSION': config.style,
    'TYPESCRIPT': config.typescript ? 'true' : 'false',
    'WITH_PROPS': config.withProps ? 'true' : 'false',
    'WITH_STATE': config.withState ? 'true' : 'false',
    'WITH_EFFECTS': config.withEffects ? 'true' : 'false',
    'ORIGINAL_FILENAME': originalFileName
  };

  return Object.entries(replacements).reduce((prompt, [key, value]) => {
    return prompt.replace(new RegExp(key, 'g'), String(value));
  }, template);
}