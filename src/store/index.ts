import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    spanDistance?: string;
  };
  imageUri: string | null;
  capturedAt: string;
  parentLabel?: string;
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
  location?: string;
  block?: string;
  district?: string;
  preparedBy?: string;
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
    hydrateAuth: (state, action: PayloadAction<any>) => {
      if (action.payload) {
        state.isLoggedIn = action.payload.isLoggedIn ?? false;
        state.surveyorName = action.payload.surveyorName ?? '';
        state.surveyorId = action.payload.surveyorId ?? '';
        state.division = action.payload.division ?? '';
        state.profileImage = action.payload.profileImage ?? null;
      }
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
  },
  {
    id: 'hist-3',
    lineType: 'LT_440V',
    contractorName: 'Power Grid Corp',
    remarks: 'Sample Branched LT Line Distribution',
    startedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    endedAt: new Date(Date.now() - 3600000 * 3 + 12000).toISOString(),
    status: 'PENDING',
    location: 'Sayan Grid Sector 4',
    block: 'Block-VII',
    district: 'North Division',
    preparedBy: 'Surveyor Sayan',
    nodes: [
      { id: 'hn-3-1', nodeType: 'DTR', sequenceNumber: 0, nameLabel: 'DTR 100KVA', latitude: 22.5710, longitude: 88.3620, attributes: { cableSize: 'DTR Lead', poleType: 'Transformer Plt', height: '9m', tilt: '0°', sag: '0m' }, imageUri: null, capturedAt: '' },
      { id: 'hn-3-2', nodeType: 'POLE', sequenceNumber: 1, nameLabel: 'P1', latitude: 22.5714, longitude: 88.3620, attributes: { cableSize: '90 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.2m' }, imageUri: null, capturedAt: '', parentLabel: 'DTR 100KVA' },
      { id: 'hn-3-3', nodeType: 'POLE', sequenceNumber: 2, nameLabel: 'P2', latitude: 22.5718, longitude: 88.3620, attributes: { cableSize: '90 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'P1' },
      { id: 'hn-3-4', nodeType: 'POLE', sequenceNumber: 3, nameLabel: 'P3', latitude: 22.5722, longitude: 88.3622, attributes: { cableSize: '90 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'P2' },
      { id: 'hn-3-5', nodeType: 'POLE', sequenceNumber: 4, nameLabel: 'P4', latitude: 22.5724, longitude: 88.3618, attributes: { cableSize: '50 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.4m' }, imageUri: null, capturedAt: '', parentLabel: 'P3' },
      { id: 'hn-3-6', nodeType: 'POLE', sequenceNumber: 5, nameLabel: 'P5', latitude: 22.5727, longitude: 88.3615, attributes: { cableSize: '50 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.4m' }, imageUri: null, capturedAt: '', parentLabel: 'P4' },
      { id: 'hn-3-7', nodeType: 'POLE', sequenceNumber: 6, nameLabel: 'P6', latitude: 22.5720, longitude: 88.3628, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '1°', sag: '0.2m' }, imageUri: null, capturedAt: '', parentLabel: 'P3' },
      { id: 'hn-3-8', nodeType: 'POLE', sequenceNumber: 7, nameLabel: 'P7', latitude: 22.5718, longitude: 88.3633, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'P6' },
      { id: 'hn-3-9', nodeType: 'POLE', sequenceNumber: 8, nameLabel: 'P8', latitude: 22.5715, longitude: 88.3637, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'P7' },
      { id: 'hn-3-10', nodeType: 'POLE', sequenceNumber: 9, nameLabel: 'P9', latitude: 22.5711, longitude: 88.3640, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'P8' },
      { id: 'hn-3-11', nodeType: 'POLE', sequenceNumber: 10, nameLabel: 'P10', latitude: 22.5717, longitude: 88.3642, attributes: { cableSize: '50 sqmm ABC', poleType: 'Concrete Pole', height: '9m', tilt: '0°', sag: '0.2m' }, imageUri: null, capturedAt: '', parentLabel: 'P8' }
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
    },
    updateSurveyLineMetadata: (state, action: PayloadAction<{ 
      id: string; 
      contractorName: string;
      remarks: string;
      location?: string; 
      block?: string; 
      district?: string; 
      preparedBy?: string; 
    }>) => {
      const line = state.historyList.find(l => l.id === action.payload.id);
      if (line) {
        line.contractorName = action.payload.contractorName;
        line.remarks = action.payload.remarks;
        line.location = action.payload.location;
        line.block = action.payload.block;
        line.district = action.payload.district;
        line.preparedBy = action.payload.preparedBy;
      }
      const queueLine = state.syncQueue.find(l => l.id === action.payload.id);
      if (queueLine) {
        queueLine.contractorName = action.payload.contractorName;
        queueLine.remarks = action.payload.remarks;
        queueLine.location = action.payload.location;
        queueLine.block = action.payload.block;
        queueLine.district = action.payload.district;
        queueLine.preparedBy = action.payload.preparedBy;
      }
    },
    updateSurveyNode: (state, action: PayloadAction<{
      lineId: string;
      nodeId: string;
      nameLabel: string;
      latitude: number;
      longitude: number;
      parentLabel?: string;
      attributes: {
        cableSize: string;
        poleType: string;
        height: string;
        tilt: string;
        sag: string;
        spanDistance?: string;
      };
    }>) => {
      const line = state.historyList.find(l => l.id === action.payload.lineId);
      if (line) {
        const node = line.nodes.find(n => n.id === action.payload.nodeId);
        if (node) {
          node.nameLabel = action.payload.nameLabel;
          node.latitude = action.payload.latitude;
          node.longitude = action.payload.longitude;
          node.parentLabel = action.payload.parentLabel;
          node.attributes = action.payload.attributes;
        }
      }
      const queueLine = state.syncQueue.find(l => l.id === action.payload.lineId);
      if (queueLine) {
        const node = queueLine.nodes.find(n => n.id === action.payload.nodeId);
        if (node) {
          node.nameLabel = action.payload.nameLabel;
          node.latitude = action.payload.latitude;
          node.longitude = action.payload.longitude;
          node.parentLabel = action.payload.parentLabel;
          node.attributes = action.payload.attributes;
        }
      }
    },
    hydrateStore: (state, action: PayloadAction<any>) => {
      if (action.payload) {
        state.activeLine = action.payload.activeLine ?? null;
        state.syncQueue = action.payload.syncQueue ?? [];
        state.completedCount = action.payload.completedCount ?? 2;
        state.historyList = action.payload.historyList ?? initialHistory;
      }
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

export const { login, logout, updateProfileImage, hydrateAuth } = authSlice.actions;
export const { startSurvey, addNode, cancelSurvey, finishSurvey, clearQueueItem, clearAllCompleted, updateSurveyLineMetadata, updateSurveyNode, hydrateStore } = surveySlice.actions;

const STORAGE_KEY = 'GIS_SURVEY_APP_STATE';

export const loadPersistedState = async () => {
  try {
    const serializedState = await AsyncStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Failed to load state:', err);
    return undefined;
  }
};

const saveState = async (state: any) => {
  try {
    const stateToSave = {
      auth: state.auth,
      survey: state.survey,
    };
    const serializedState = JSON.stringify(stateToSave);
    await AsyncStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error('Failed to save state:', err);
  }
};

store.subscribe(() => {
  saveState(store.getState());
});
