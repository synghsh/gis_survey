import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types representing survey structures
export interface SurveyNode {
  id: string;
  nodeType: 'DTR' | 'POLE';
  sequenceNumber: number;
  nameLabel: string;
  latitude: number;
  longitude: number;
  attributes: {
    cableSize: string;
    poleType: string;
    height: string;
    tilt: string;
    sag: string;
  };
  imageUri: string | null;
  capturedAt: string;
}

export interface SurveyLine {
  id: string;
  lineType: 'HT_11KV' | 'HT_33KV' | 'LT_440V';
  contractorName: string;
  remarks: string;
  nodes: SurveyNode[];
  startedAt: string;
  endedAt?: string;
}

// Slice 1: Authentication State
interface AuthState {
  isLoggedIn: boolean;
  surveyorName: string;
  surveyorId: string;
  division: string;
}

const initialAuthState: AuthState = {
  isLoggedIn: false,
  surveyorName: '',
  surveyorId: '',
  division: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    login: (state, action: PayloadAction<{ name: string; srvId: string; div: string }>) => {
      state.isLoggedIn = true;
      state.surveyorName = action.payload.name;
      state.surveyorId = action.payload.srvId;
      state.division = action.payload.div;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.surveyorName = '';
      state.surveyorId = '';
      state.division = '';
    },
  },
});

// Slice 2: Navigation state
interface NavState {
  currentScreen: 'INTRO' | 'LOGIN' | 'DASHBOARD' | 'SURVEY' | 'QUEUE';
}

const initialNavState: NavState = {
  currentScreen: 'INTRO',
};

const navSlice = createSlice({
  name: 'navigation',
  initialState: initialNavState,
  reducers: {
    navigateTo: (state, action: PayloadAction<NavState['currentScreen']>) => {
      state.currentScreen = action.payload;
    },
  },
});

// Slice 3: Active survey & offline sync queue
interface SurveyState {
  activeLine: SurveyLine | null;
  syncQueue: SurveyLine[];
  completedCount: number;
}

const initialSurveyState: SurveyState = {
  activeLine: null,
  syncQueue: [],
  completedCount: 0,
};

const surveySlice = createSlice({
  name: 'survey',
  initialState: initialSurveyState,
  reducers: {
    startSurvey: (state, action: PayloadAction<Omit<SurveyLine, 'nodes' | 'startedAt'>>) => {
      state.activeLine = {
        ...action.payload,
        nodes: [],
        startedAt: new Date().toISOString(),
      };
    },
    addNode: (state, action: PayloadAction<SurveyNode>) => {
      if (state.activeLine) {
        state.activeLine.nodes.push(action.payload);
      }
    },
    cancelSurvey: (state) => {
      state.activeLine = null;
    },
    finishSurvey: (state) => {
      if (state.activeLine) {
        state.activeLine.endedAt = new Date().toISOString();
        state.syncQueue.push(state.activeLine);
        state.activeLine = null;
      }
    },
    clearQueueItem: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter(line => line.id !== action.payload);
      state.completedCount += 1;
    },
    clearAllCompleted: (state) => {
      state.syncQueue = [];
    }
  },
});

// Root Store
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    navigation: navSlice.reducer,
    survey: surveySlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { login, logout } = authSlice.actions;
export const { navigateTo } = navSlice.actions;
export const { startSurvey, addNode, cancelSurvey, finishSurvey, clearQueueItem, clearAllCompleted } = surveySlice.actions;
