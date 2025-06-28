// @src/APIs/redux/api/apiSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import Request from './backendRequest'; // Import the Request utility

// Define the shape of your state
interface ApiState {
  data: any;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: ApiState = {
  data: null,
  loading: 'idle',
  error: null,
};

// Create async thunks using the Request utility
export const fetchApiData = createAsyncThunk(
  'api/fetchData',
  async (params: { id: string }, { rejectWithValue }:{rejectWithValue:any}) => {
    try {
      const response = await Request({
        endpointId: 'API', // Must match your ApiEndpoint key
        slug: params.id, // Appends to the URL (e.g., `/api/data/${id}`)
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch data');
    }
  }
);

export const createApiData = createAsyncThunk(
  'api/createData',
  async (payload: any, { rejectWithValue }:{rejectWithValue:any}) => {
    try {
      const response = await Request({
        endpointId: 'API', // Must match your ApiEndpoint key
        data: payload,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create data');
    }
  }
);

const apiSlice = createSlice({
  name: 'apiState',
  initialState,
  reducers: {
    resetApiState: () => initialState,
    setApiData: (state, action: PayloadAction<any>) => {
      state.data = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Generic matcher for all async thunks
    const addRequestMatchers = (thunk: any) => {
      builder
        .addCase(thunk.pending, (state:any) => {
          state.loading = 'pending';
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state:any, action:any) => {
          state.loading = 'succeeded';
          state.data = action.payload;
        })
        .addCase(thunk.rejected, (state: any, action:any) => {
          state.loading = 'failed';
          state.error = action.payload as string || 'Request failed';
        });
    };

    // Apply to all async thunks
    addRequestMatchers(fetchApiData);
    addRequestMatchers(createApiData);
  },
});

// Export actions and selectors
export const { resetApiState, setApiData } = apiSlice.actions;
export const selectApiData = (state: { apiState : ApiState }) => state.apiState.data;
export const selectApiLoading = (state: { apiState : ApiState }) => state.apiState.loading;
export const selectApiError = (state: { apiState : ApiState }) => state.apiState.error;

export default apiSlice.reducer;