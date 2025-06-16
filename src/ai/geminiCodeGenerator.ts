import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { ApiType, ComponentType, ProjectType } from '../../bin/types/enums';
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
        componentsToImport?: {name: string, data: string}[]

    } = {}
): Promise<TemplateFileInfo[]> {
    
    const apiKey = getApiKey();
    if (!apiKey) throw new Error(`API key is required.`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const updatedFiles: TemplateFileInfo[] = [];

    const baseConfig = {
        componentName: fileName,
        aiDescription,
        projectType,
        componentType,
        ...options
    };

    // First, find and generate the main component file
    const componentFile = templateFiles.find(file => 
        path.extname(file.originalFileName) === '.tsx' || 
        path.extname(file.originalFileName) === '.jsx'
    );

    if (!componentFile) {
        throw new Error('No component file found in template files');
    }

    // Generate the component first
    const { systemPrompt: componentSystemPrompt, userPrompt: componentUserPrompt } = getFileSpecificPrompts(
        path.extname(componentFile.originalFileName).replace('.', ''),
        componentType,
        componentFile.content || '',
        baseConfig,
        componentFile.originalFileName,
        componentFile.targetFileName,
        extraOptions.componentsToImport
    );

    const componentContent = await generateWithGemini(model, componentSystemPrompt, componentUserPrompt);

    updatedFiles.push({
        ...componentFile,
        content: componentContent
    });

    // Now generate supporting files (tests, stories, css) using the component content
    for (const fileTemplate of templateFiles.filter(file => file !== componentFile)) {
        const fileType = path.extname(fileTemplate.originalFileName).replace('.', '');

        // Get specialized prompt for each file type
        const { systemPrompt, userPrompt } = getFileSpecificPrompts(
            fileType,
            componentType,
            fileTemplate.content || '',
            baseConfig,
            fileTemplate.originalFileName,
            fileTemplate.targetFileName,
            extraOptions.componentsToImport,
            componentContent, // Pass the generated component content
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
    originalFileName: string,
    targetFileName: string,
    componentsToImport?: {name: string, data: string}[],
    componentContent?: string, // New parameter for the generated component content

): { systemPrompt: string; userPrompt: string } {
    // Base system prompt
    const baseSystemPrompt = `You are an expert full-stack developer. Generate clean, production-ready code that:
- Follows best practices for the specific file type
- Is fully functional
- Matches modern architectural patterns
- Maintains consistent theming with other related files
- Uses the correct target file name (${targetFileName}) for all references`;

    // Extract base component name without extension
    const isTestFile = originalFileName.includes('.test.');
    const isStoriesFile = originalFileName.includes('.stories.');

    // Create imports string if componentsToImport exists


    // File-specific prompts
    if (isTestFile) {
        return {
            systemPrompt: `${baseSystemPrompt}
- For React component tests only
- Use Testing Library best practices
- Include meaningful test cases that match the component's theme
- Test all component functionality
- Keep the same testing approach as shown in the original file
- Import the component using the target file name (${targetFileName})`,
            userPrompt: `Generate a test file for the following ${targetFileName} component while maintaining consistent theming:

Component Description: ${baseConfig.aiDescription}
Component Type: ${baseConfig.componentType}
Target File Name: ${targetFileName}


Component Content to test:
${componentContent} 


Key Requirements:
1. Import the component from '${targetFileName}'
3. Create comprehensive tests that cover all functionality
4. Test all props and interactions
5. Use Testing Library best practices
6. Include accessibility tests if applicable

Return ONLY the test file content with no additional explanations.`
        };
    } else if (isStoriesFile) {
        return {
            systemPrompt: `${baseSystemPrompt}
- For Storybook stories only
- Use StoryObj type for stories
- Include proper Meta configuration
- Add comprehensive controls that match the component's theme
- Maintain the same story structure as the original
- Import the component using the target file name (${targetFileName})`,
            userPrompt: `Generate a Storybook story file for the following ${targetFileName} component with Component Content:
${componentContent}:

Component Description: ${baseConfig.aiDescription}
Component Type: ${baseConfig.componentType}
Target File Name: ${targetFileName}
Key Requirements:
1. Import the component from '${targetFileName}'
2. Create a default story with all controls and props from ${componentContent}
3. Add relevant stories that showcase different states
4. Include proper JSDoc documentation
5. Use TypeScript types for all args

Return ONLY the story file content with no additional explanations.`
        };
    } else if (fileType === 'tsx') {
         const baseFileName = targetFileName.replace(/\.tsx$/, '');
        return {
            systemPrompt: `${baseSystemPrompt}
- For React components only
- Include proper TypeScript types and props. take help from mui props but dont import anything from mui.
- Use clean TSX syntax
- Follow accessibility best practices
- Match the style of the original component
- Use ${targetFileName} as the component name`,
            userPrompt: `Create a React component file based on the following requirements:

Component Name: ${targetFileName}
Description: ${baseConfig.aiDescription}. Add Proper styling with className for multiple screen size.
Component Type: ${baseConfig.componentType}
Style Type: Provide css className with  ${baseFileName}.css . later I will add css file
Target File Name: ${targetFileName}
Import componentToImport as "@/components/${targetFileName}/${targetFileName}"
Key Requirements:
1. Use TypeScript with proper typing
2. Follow React best practices
3. Include all necessary props
4. Implement the described functionality: ${baseConfig.aiDescription}
5. Provide css className later I will add css file. Do not mix css with main tsx file. make sure to import ${baseFileName}.css
Return ONLY the component code with no additional explanations. 
`
        };
    } else if (fileType === 'css' || fileType === 'scss') {
        return {
            systemPrompt: `${baseSystemPrompt}
- For CSS/SCSS styles only
- Use modern styling approaches
- Include responsive design
- Follow BEM naming if appropriate
- Match the existing styling patterns
- Update selectors to match ${targetFileName}`,
            userPrompt: `Generate a style file for the following ${targetFileName} component from Component Content:
${componentContent}:

Component Description: ${baseConfig.aiDescription}
Component Type: ${baseConfig.componentType}
Style Type: ${baseConfig.style}
Target File Name: ${targetFileName}

Key Requirements:
1. Create styles that match the component structure
2. Use ${baseConfig.style} syntax
3. Include responsive design
4. Follow BEM naming convention if appropriate
5. Style all interactive states

Return ONLY the style rules with no additional explanations.`
        };
    } else {
        return {
            systemPrompt: baseSystemPrompt,
            userPrompt: `Generate this file based on the following requirements:
        
Component Name: ${targetFileName}
Description: ${baseConfig.aiDescription}
Component Type: ${baseConfig.componentType}
Target File Name: ${targetFileName}

Key Requirements:
1. Create a complete file that matches the file type
2. Maintain consistent patterns with the project
3. Include all necessary functionality

Return ONLY the file content with no additional explanations.`
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