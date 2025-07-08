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
    updateExistingTemplateFiles?: boolean,
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

    // Sort template files to ensure main component is processed first
    const sortedTemplateFiles = [...templateFiles].sort((a, b) => {
        // Main component should come first
        if (a.originalFileName === `${fileName}.tsx`) return -1;
        if (b.originalFileName === `${fileName}.tsx`) return 1;
        
        // Then process CSS
        if (a.originalFileName.endsWith('.css')) return -1;
        if (b.originalFileName.endsWith('.css')) return 1;
        
        // Then tests
        if (a.originalFileName.includes('.test.')) return -1;
        if (b.originalFileName.includes('.test.')) return 1;
        
        // Finally stories
        return 0;
    });

    // Find and generate the main component file first
    const componentFile = sortedTemplateFiles.find(file => 
        file.originalFileName === `${fileName}.tsx` || 
        file.originalFileName === `${fileName}.jsx`
    );

    if (!componentFile) {
        throw new Error(`No component file found for ${fileName}`);
    }

    // Generate the component first
    const componentExt = path.extname(componentFile.originalFileName).replace('.', '');
    const { systemPrompt: componentSystemPrompt, userPrompt: componentUserPrompt } = await getFileSpecificPrompts(
        componentExt,
        componentType,
        componentFile.content || '',
        baseConfig,
        componentFile.originalFileName,
        componentFile.targetFileName,
        extraOptions.componentsToImport,
        undefined,
        updateExistingTemplateFiles
    );

    const componentContent = await generateWithGemini(model, componentSystemPrompt, componentUserPrompt);
    const generatedComponentContent = componentContent;

    updatedFiles.push({
        ...componentFile,
        content: generatedComponentContent
    });

    // Now generate supporting files in order
    for (const fileTemplate of sortedTemplateFiles.filter(file => file !== componentFile)) {
        const fileNameParts = fileTemplate.originalFileName.split('.');
        let fileType = fileNameParts.length > 1 ? fileNameParts.slice(1).join('.') : '';
        
        const { systemPrompt, userPrompt } = await getFileSpecificPrompts(
            fileType,
            componentType,
            fileTemplate.content || '',
            baseConfig,
            fileTemplate.originalFileName,
            fileTemplate.targetFileName,
            extraOptions.componentsToImport,
            generatedComponentContent, // Always use the newly generated component
            updateExistingTemplateFiles
        );

        const aiUpdatedContent = await generateWithGemini(model, systemPrompt, userPrompt);

        updatedFiles.push({
            ...fileTemplate,
            content: aiUpdatedContent
        });
    }

    return updatedFiles;
}

async function getFileSpecificPrompts(
    fileType: string,
    componentType: ComponentType | ApiType,
    originalContent: string,
    baseConfig: any,
    originalFileName: string,
    targetFileName: string,
    componentsToImport?: {name: string, data: string}[],
    componentContent?: string, // New parameter for the generated component content
    updateExistingTemplateFiles?:boolean
): Promise<{ systemPrompt: string; userPrompt: string; }> {

    // Base system prompt
    const baseSystemPrompt = `You are an expert full-stack developer. Generate clean, production-ready code that:
- Follows best practices for the specific file type
- Is fully functional
- Matches modern architectural patterns
- Maintains consistent theming with other related files
- Uses the correct target file name (${targetFileName}) for all references.
- if ${updateExistingTemplateFiles} 'Update the existing component template files with that modification only as told by user in code. '
- `;


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

Original test: ${originalContent}

Key Requirements:
1. Import the component from '${targetFileName}'
2. Create comprehensive tests that cover all functionality
3. Test all props and interactions
4. Use Testing Library best practices
5. Include accessibility tests if applicable
6. Implement the described functionality: ${baseConfig.aiDescription} and if ${updateExistingTemplateFiles} Update only the code Make sure no much modigfication is required in the code
7.  make sure to import ${targetFileName}.css

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
Original Stories: ${originalContent}

Component Description: ${baseConfig.aiDescription}
Component Type: ${baseConfig.componentType}
Target File Name: ${targetFileName}
Key Requirements:
1. Import the component from '${targetFileName}'
2. Create a default story with all controls and props from ${componentContent}
3. Add relevant stories that showcase different states
4. Include proper JSDoc documentation
5. Use TypeScript types for all args
6. Implement the described functionality: ${baseConfig.aiDescription} and if ${updateExistingTemplateFiles} Update only the code Make sure no much modigfication is required in the code
7.  make sure to import ${targetFileName}.css
Return ONLY the story file content with no additional explanations.`
        };
    } else if (fileType === 'tsx') {
         const baseFileName = targetFileName.replace(/\.tsx$/, '');
         return {
             systemPrompt: `${baseSystemPrompt}
             - For React components only
             - Original Content: ${originalContent} .
- Include proper TypeScript types and props. take help from mui props but dont import anything from mui.
- Use clean TSX syntax
- if ${updateExistingTemplateFiles} Do not completely change the code, only update it according to ${baseConfig.aiDescription}
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
4. Implement the described functionality: ${baseConfig.aiDescription} and if ${updateExistingTemplateFiles} Update only the code Make sure no much modigfication is required in the code
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

Original css: ${originalContent}

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