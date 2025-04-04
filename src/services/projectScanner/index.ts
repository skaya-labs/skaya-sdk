// utils/projectScanner.ts
import fs from 'fs-extra';
import path from 'path';
import { 
  ProjectType, 
  BackendComponentType,
  FrontendComponentType
} from '../../../bin/types/enums';

type StructureConfig = {
  [key in ProjectType]: {
    defaultPaths: string[];
    alternatives: string[];
  }
};

const structureConfig: StructureConfig = {
  [ProjectType.FRONTEND]: {
    defaultPaths: [
      'src/components',
      'frontend/src/components',
      'app/components'
    ],
    alternatives: [
      'components',
      'src/ui',
      'lib/components'
    ]
  },
  [ProjectType.BACKEND]: {
    defaultPaths: [
      'src/controllers',
      'server/src/controllers',
      'app/controllers'
    ],
    alternatives: [
      'controllers',
      'api/controllers',
      'lib/controllers'
    ]
  },
};

export async function detectProjectStructure(
  category: ProjectType,
  specificType?: FrontendComponentType | BackendComponentType,
  basePath: string = process.cwd()
): Promise<string> {
  // Check if we need to look for a specific sub-type
  const typeSpecificPaths = specificType 
    ? [`src/${specificType}`, `${specificType}`] 
    : [];

  // Combine all possible paths to check
  const pathsToCheck = [
    ...typeSpecificPaths,
    ...structureConfig[category].defaultPaths,
    ...structureConfig[category].alternatives
  ];

  // Check each path
  for (const folder of pathsToCheck) {
    const fullPath = path.join(basePath, folder);
    if (await fs.pathExists(fullPath)) {
      return folder;
    }
  }

  // Fallback for specific types
  if (specificType) {
    return `src/${specificType}`;
  }

  // Final fallback
  return structureConfig[category].defaultPaths[0];
}

export async function detectComponentType(
  projectType: ProjectType,
  componentType: string,
  basePath: string = process.cwd()
): Promise<{ category: ProjectType; path: string }> {
  let category: ProjectType;
  let specificType: FrontendComponentType | BackendComponentType | undefined;

  switch (projectType) {
    case ProjectType.FRONTEND:
      category = ProjectType.FRONTEND;
      specificType = FrontendComponentType[componentType.toUpperCase() as keyof typeof FrontendComponentType];
      break;
    case ProjectType.BACKEND:
      category = ProjectType.BACKEND;
      specificType = BackendComponentType[componentType.toUpperCase() as keyof typeof BackendComponentType];
      break;
    default:
      category = ProjectType[projectType as keyof typeof ProjectType];
  }

  const detectedPath = await detectProjectStructure(category, specificType, basePath);
  
  return {
    category,
    path: detectedPath
  };
}