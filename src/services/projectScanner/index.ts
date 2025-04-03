// utils/projectScanner.ts
import fs from 'fs-extra';
import path from 'path';
import { 
  ComponentCategory,
  FrontendStructure,
  BackendStructure,
  ProjectType 
} from '../../../bin/types/enums';

type StructureConfig = {
  [key in ComponentCategory]: {
    defaultPaths: string[];
    alternatives: string[];
  }
};

const structureConfig: StructureConfig = {
  [ComponentCategory.FRONTEND]: {
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
  [ComponentCategory.BACKEND]: {
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
  [ComponentCategory.MIDDLEWARE]: {
    defaultPaths: [
      'src/middlewares',
      'server/src/middlewares'
    ],
    alternatives: [
      'middlewares',
      'api/middlewares'
    ]
  },
  [ComponentCategory.TEST]: {
    defaultPaths: [
      'test',
      '__tests__',
      'spec'
    ],
    alternatives: []
  },
  [ComponentCategory.CONFIG]: {
    defaultPaths: [
      'config',
      'configuration'
    ],
    alternatives: []
  }
};

export async function detectProjectStructure(
  category: ComponentCategory,
  specificType?: FrontendStructure | BackendStructure,
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
): Promise<{ category: ComponentCategory; path: string }> {
  let category: ComponentCategory;
  let specificType: FrontendStructure | BackendStructure | undefined;

  switch (projectType) {
    case ProjectType.FRONTEND:
      category = ComponentCategory.FRONTEND;
      specificType = FrontendStructure[componentType.toUpperCase() as keyof typeof FrontendStructure];
      break;
    case ProjectType.BACKEND:
      category = ComponentCategory.BACKEND;
      specificType = BackendStructure[componentType.toUpperCase() as keyof typeof BackendStructure];
      break;
    default:
      category = ComponentCategory[projectType as keyof typeof ComponentCategory];
  }

  const detectedPath = await detectProjectStructure(category, specificType, basePath);
  
  return {
    category,
    path: detectedPath
  };
}