import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from '../../bin/types/enums';
import inquirer from "inquirer";
import { ComponentGenerationOptions, TemplateFileInfo } from "../scripts/templateGenerator";
import { getApiKey } from "../config";


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
  },
  templateFiles: TemplateFileInfo[] = []
): Promise<TemplateFileInfo[]> {

  const apiKey = getApiKey();
  if (!apiKey) throw new Error(`${apiKey} API key is required.`,);

  const openai = new OpenAI({ apiKey });

  const updatedFiles: TemplateFileInfo[] = [];

  const baseConfig = {
    componentName: fileName,
    description,
    projectType,
    componentType,
    ...options
  };

  for (const fileTemplate of templateFiles) {
    const templateDir = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), componentType);
    const sourcePath = path.join(templateDir, fileTemplate.originalFileName);

    if (!existsSync(sourcePath)) {
        throw new Error(`Template file not found: ${sourcePath}`);
    }
    
    const originalContent = readFileSync(sourcePath, 'utf-8');  // Now reading the file, not the directory
    const fileType = path.extname(fileTemplate.originalFileName).replace('.', '');
    const systemPrompt = getSystemPrompt(fileType, componentType);
    const userPrompt = buildFilePrompt(originalContent, baseConfig, fileTemplate.originalFileName);

    const aiUpdatedContent = await generateWithAI(openai, systemPrompt, userPrompt);

    updatedFiles.push({
        ...fileTemplate,
        content: aiUpdatedContent
    });
}

  return updatedFiles;
}


async function generateWithAI(openai: OpenAI, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating file with AI:', error);
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
        ? `${basePrompt} for React page components. Include:
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
  originalFileContent: string,
  config: Record<string, any>,
  originalFileName: string
): string {
  return `
Update the following file based on the configuration below:

Configuration:
- Component Name: ${config.componentName}
- Component Type: ${config.componentType}
- Description: ${config.description}
- Project Type: ${config.projectType}
- Style: ${config.style}
- TypeScript: ${config.typescript}
- With Props: ${config.withProps}
- With State: ${config.withState}
- With Effects: ${config.withEffects}
- With Tests: ${config.withTests}
- With Stories: ${config.withStories}
- Original File Name: ${originalFileName}

File Content:
\`\`\`
${originalFileContent}
\`\`\`

Return only the updated file content. Do not include explanation or markdown syntax.
`;
}