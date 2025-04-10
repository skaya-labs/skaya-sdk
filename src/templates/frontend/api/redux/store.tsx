import { configureStore, ThunkAction, Action, Reducer } from '@reduxjs/toolkit';

// Dynamic import function for Node.js/Vite/Webpack environment
const importAllReducers = () => {
  try {
    // For Webpack/Vite environment
    const reducers = import.meta.glob('./reduxSlices/**/*Slice.ts', { eager: true });
    // Or for Node.js environment (if using require.context)
    // const reducers = require.context('@src/APIs/reduxSlices', true, /Slice\.ts$/);
    
    const modules: Record<string, Reducer> = {};
    
    for (const path in reducers) {
      const match = path.match(/reduxSlices\/(.*?)\/(.*?)Slice\.ts/);
      if (match) {
        const [, folder, sliceName] = match;
        const reducerName = folder || sliceName;
        modules[reducerName] = (reducers[path] as any).default;
      }
    }
    
    return modules;
  } catch (error) {
    console.error('Error importing reducers:', error);
    return {};
  }
};

export const makeStore = () => {
  const reducers = importAllReducers();
  
  return configureStore({
    reducer: reducers,
    // Add middleware or other store configurations here
  });
};

// Type definitions remain the same
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;