import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { ApiType, BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from '../../bin/types/enums';
import { ComponentGenerationOptions, TemplateFileInfo } from "../scripts/templateGenerator";
import { getApiKey } from "../config";

export async function generateCodeWithAI(
    fileName: string,
    projectType: ProjectType,
    componentType: ComponentType | ApiType,
    aiDescription: string = '',
    options: ComponentGenerationOptions = {
        style: 'css',
        typescript: true,
        withProps: true,
        withState: false,
        withEffects: false,
        withTests: true,
        withStories: projectType === ProjectType.FRONTEND
    },
    templateFiles: TemplateFileInfo[] = [],
    extraOptions: {
        importExisting?: boolean;
        componentsToImport?: string[];
    } = {}
): Promise<TemplateFileInfo[]> {

    const apiKey = getApiKey();
    if (!apiKey) throw new Error(`API key is required.`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const updatedFiles: TemplateFileInfo[] = [];

    const baseConfig = {
        componentName: fileName,
        aiDescription,
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

        const originalContent = readFileSync(sourcePath, 'utf-8');
        const fileType = path.extname(fileTemplate.originalFileName).replace('.', '');

        // Get specialized prompt for each file type
        const { systemPrompt, userPrompt } = getFileSpecificPrompts(
            fileType,
            componentType,
            originalContent,
            baseConfig,
            fileTemplate.originalFileName
        );

        const aiUpdatedContent = await generateWithGemini(model, systemPrompt, userPrompt);

        updatedFiles.push({
            ...fileTemplate,
            content: aiUpdatedContent
        });
    }

    return updatedFiles;
}

function getFileSpecificPrompts(
    fileType: string,
    componentType: ComponentType | ApiType,
    originalContent: string,
    baseConfig: any,
    fileName: string
): { systemPrompt: string; userPrompt: string } {
    // Base system prompt
    const baseSystemPrompt = `You are an expert full-stack developer. Generate clean, production-ready code that:
- Follows best practices for the specific file type
- Is fully functional
- Matches modern architectural patterns`;

    // File-specific prompts
    switch (fileType) {
        case 'tsx': // Main component file
            return {
                systemPrompt: `${baseSystemPrompt}
- For React components only
- Include proper TypeScript types
- Use clean JSX syntax
- Follow accessibility best practices`,
                userPrompt: `Update this React component file based on the following requirements:
        
Component Name: ${baseConfig.componentName}
Description: ${baseConfig.aiDescription}
Style Type: ${baseConfig.style}

Original File Content:
\`\`\`tsx
${originalContent}
\`\`\`

Return ONLY the updated component code with no additional explanations.`
            };

        case 'test.tsx': // Test file
            return {
                systemPrompt: `${baseSystemPrompt}
- For React component tests only
- Use Testing Library best practices
- Include meaningful test cases
- Test all component functionality`,
                userPrompt: `Update this test file to properly test the ${baseConfig.componentName} component:

Component Description: ${baseConfig.aiDescription}

Original Test File:
\`\`\`tsx
${originalContent}
\`\`\`

Return ONLY the updated test file content with no additional explanations.`
            };

            case 'stories.tsx': // Storybook file
            return {
                systemPrompt: `${baseSystemPrompt}
        - Generate ONLY Storybook stories following the exact template format
        - Use StoryObj type for stories
        - Include proper Meta configuration
        - Add comprehensive controls
        - Do NOT include component implementation - this should only be the story configuration`,
                userPrompt: `Create a Storybook story file for the ${baseConfig.componentName} component following this exact template format:
        
        Component Description: ${baseConfig.aiDescription}
        
        Template Format:
        import { Meta, StoryObj } from '@storybook/react';
        import ${baseConfig.componentName} from './${baseConfig.componentName}';
        
        const meta: Meta<typeof ${baseConfig.componentName}> = {
          title: 'Example/${baseConfig.componentName}',
          component: ${baseConfig.componentName},
          tags: ['autodocs'],
          argTypes: {
            // Add controls configuration here
          },
        };
        
        export default meta;
        type Story = StoryObj<typeof ${baseConfig.componentName}>;
        
        export const Default: Story = {
          args: {
            // Default props here
          },
        };
        
        Return ONLY the story file content in this exact format with no additional explanations or component implementation.`
            };
        case 'css':
        case 'scss': // Style file
            return {
                systemPrompt: `${baseSystemPrompt}
- For CSS/SCSS styles only
- Use modern styling approaches
- Include responsive design
- Follow BEM naming if appropriate`,
                userPrompt: `Update this style file for the ${baseConfig.componentName} component:

Component Description: ${baseConfig.aiDescription}
Style Type: ${baseConfig.style}

Original Style File:
\`\`\`${fileType}
${originalContent}
\`\`\`

Return ONLY the updated style rules with no additional explanations.`
            };

        default:
            return {
                systemPrompt: baseSystemPrompt,
                userPrompt: `Update this file based on the following:
        
Component Name: ${baseConfig.componentName}
Description: ${baseConfig.aiDescription}

Original File:
\`\`\`
${originalContent}
\`\`\`

Return ONLY the updated file content with no additional explanations.`
            };
    }
}

async function generateWithGemini(model: any, systemPrompt: string, userPrompt: string): Promise<string> {
    try {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text().trim();
        return text.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    } catch (error) {
        console.error('Error generating file with Gemini:', error);
        return '';
    }
}