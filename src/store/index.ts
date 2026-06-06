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
  status: 'PENDING' | 'SYNCED';
}

// Slice 1: Authentication & Profile State
interface AuthState {
  isLoggedIn: boolean;
  surveyorName: string;
  surveyorId: string;
  division: string;
  profileImage: string | null;
}

const initialAuthState: AuthState = {
  isLoggedIn: false,
  surveyorName: '',
  surveyorId: '',
  division: '',
  profileImage: null,
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
      state.profileImage = null;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.surveyorName = '';
      state.surveyorId = '';
      state.division = '';
      state.profileImage = null;
    },
    updateProfileImage: (state, action: PayloadAction<string>) => {
      state.profileImage = action.payload;
    },
  },
});



// Slice 3: Active survey & offline sync queue
interface SurveyState {
  activeLine: SurveyLine | null;
  syncQueue: SurveyLine[];
  completedCount: number;
  historyList: SurveyLine[];
}

const initialHistory: SurveyLine[] = [
  {
    id: 'hist-1',
    lineType: 'HT_33KV',
    contractorName: 'L&T Power Grid',
    remarks: 'Erected 12 poles along Highway 11',
    startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    endedAt: new Date(Date.now() - 86400000 * 2 + 10000).toISOString(),
    status: 'SYNCED',
    nodes: [
      { id: 'hn-1', nodeType: 'DTR', sequenceNumber: 0, nameLabel: 'DTR-33-A', latitude: 22.571, longitude: 88.362, attributes: { cableSize: 'Grid spec', poleType: 'Transformer', height: '11m', tilt: '0', sag: '0' }, imageUri: null, capturedAt: '' },
      { id: 'hn-2', nodeType: 'POLE', sequenceNumber: 1, nameLabel: 'P-1', latitude: 22.572, longitude: 88.363, attributes: { cableSize: '150 sqmm ACSR', poleType: 'Concrete', height: '11m', tilt: '0', sag: '0.3m' }, imageUri: null, capturedAt: '' }
    ]
  },
  {
    id: 'hist-2',
    lineType: 'HT_11KV',
    contractorName: 'Tata Electrics',
    remarks: 'Industrial feeder distribution line',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    endedAt: new Date(Date.now() - 86400000 + 8000).toISOString(),
    status: 'SYNCED',
    nodes: [
      { id: 'hn-3', nodeType: 'DTR', sequenceNumber: 0, nameLabel: 'DTR-11-F', latitude: 22.580, longitude: 88.371, attributes: { cableSize: 'Grid spec', poleType: 'Transformer', height: '9m', tilt: '0', sag: '0' }, imageUri: null, capturedAt: '' },
      { id: 'hn-4', nodeType: 'POLE', sequenceNumber: 1, nameLabel: 'P-1', latitude: 22.581, longitude: 88.372, attributes: { cableSize: '100 sqmm ACSR', poleType: 'Concrete', height: '9m', tilt: '1°', sag: '0.4m' }, imageUri: null, capturedAt: '' }
    ]
  }
];

const surveySlice = createSlice({
  name: 'survey',
  initialState: {
    activeLine: null,
    syncQueue: [],
    completedCount: 2,
    historyList: initialHistory,
  } as SurveyState,
  reducers: {
    startSurvey: (state, action: PayloadAction<Omit<SurveyLine, 'nodes' | 'startedAt' | 'status'>>) => {
      state.activeLine = {
        ...action.payload,
        nodes: [],
        startedAt: new Date().toISOString(),
        status: 'PENDING',
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
        state.historyList.unshift(state.activeLine);
        state.activeLine = null;
      }
    },
    clearQueueItem: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter(line => line.id !== action.payload);
      state.historyList = state.historyList.map(line => {
        if (line.id === action.payload) {
          return { ...line, status: 'SYNCED' };
        }
        return line;
      });
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
    survey: surveySlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { login, logout, updateProfileImage } = authSlice.actions;
export const { startSurvey, addNode, cancelSurvey, finishSurvey, clearQueueItem, clearAllCompleted } = surveySlice.actions;
