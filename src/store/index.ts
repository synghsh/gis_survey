import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types representing survey structures
export interface SurveyNode {
  id: string;
  nodeType: 'DTR' | 'POLE';
  assetStatus?: 'OLD' | 'NEW';
  lineSection?: 'HT' | 'LT';
  structureRole?: 'TAP';
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
  workflowType?: 'SURVEY' | 'ERECTION';
  isCompleted?: boolean;
  completedAt?: string;
  editingExisting?: boolean;
  continuationParentLabel?: string;
  lineType: string | number;
  ltStartingPoint?: string | number;
  contractorName: string;
  remarks: string;
  nodes: SurveyNode[];
  startedAt: string;
  endedAt?: string;
  status: 'PENDING' | 'SYNCED';
  location?: string;
  stateName?: string;
  village?: string;
  block?: string;
  district?: string;
  preparedBy?: string;
  feederName?: string;
  dtrCode?: string;
  drawingNo?: string;
}

// Slice 1: Authentication & Profile State
interface AuthState {
  isLoggedIn: boolean;
  surveyorName: string;
  surveyorId: string;
  division: string;
  profileImage: string | null;
  // API identity details
  token: string | null;
  userId: number | null;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  roleName: string;
  designationName: string;
}

const initialAuthState: AuthState = {
  isLoggedIn: false,
  surveyorName: '',
  surveyorId: '',
  division: '',
  profileImage: null,
  token: null,
  userId: null,
  firstName: '',
  lastName: '',
  username: '',
  phone: '',
  email: '',
  roleName: '',
  designationName: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{
        token: string;
        user_id: number;
        first_name: string;
        last_name: string;
        username: string;
        phone: string;
        email: string;
        role_name: string;
        designation_name: string;
      }>
    ) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.userId = action.payload.user_id;
      state.firstName = action.payload.first_name;
      state.lastName = action.payload.last_name;
      state.username = action.payload.username;
      state.phone = action.payload.phone;
      state.email = action.payload.email;
      state.roleName = action.payload.role_name;
      state.designationName = action.payload.designation_name;
      // Map to legacy fields
      state.surveyorName = `${action.payload.first_name} ${action.payload.last_name}`.trim();
      state.surveyorId = `SRV-${action.payload.user_id}`;
      state.division = action.payload.role_name || 'Central Division';
      state.profileImage = null;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.surveyorName = '';
      state.surveyorId = '';
      state.division = '';
      state.profileImage = null;
      state.token = null;
      state.userId = null;
      state.firstName = '';
      state.lastName = '';
      state.username = '';
      state.phone = '';
      state.email = '';
      state.roleName = '';
      state.designationName = '';
    },
    updateProfileImage: (state, action: PayloadAction<string>) => {
      state.profileImage = action.payload;
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    hydrateAuth: (state, action: PayloadAction<any>) => {
      if (action.payload) {
        state.isLoggedIn = action.payload.isLoggedIn ?? false;
        state.surveyorName = action.payload.surveyorName ?? '';
        state.surveyorId = action.payload.surveyorId ?? '';
        state.division = action.payload.division ?? '';
        state.profileImage = action.payload.profileImage ?? null;
        state.token = action.payload.token ?? null;
        state.userId = action.payload.userId ?? null;
        state.firstName = action.payload.firstName ?? '';
        state.lastName = action.payload.lastName ?? '';
        state.username = action.payload.username ?? '';
        state.phone = action.payload.phone ?? '';
        state.email = action.payload.email ?? '';
        state.roleName = action.payload.roleName ?? '';
        state.designationName = action.payload.designationName ?? '';
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
  erectionList: any[];
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
    ltStartingPoint: 'HT_TAPPING_POINT',
    contractorName: 'Power Grid Corp',
    remarks: '11KV HT tapping point through DTR to branched LT line distribution',
    startedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    endedAt: new Date(Date.now() - 3600000 * 3 + 12000).toISOString(),
    status: 'PENDING',
    location: 'Sayan Grid Sector 4',
    block: 'Block-VII',
    district: 'North Division',
    preparedBy: 'Surveyor Sayan',
    nodes: [
      { id: 'hn-3-1', nodeType: 'POLE', assetStatus: 'OLD', lineSection: 'HT', structureRole: 'TAP', sequenceNumber: 0, nameLabel: 'TAP-1', latitude: 22.5710, longitude: 88.3620, attributes: { cableSize: '100 sqmm ACSR', poleType: 'HT Tap Pole', height: '11m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '' },
      { id: 'hn-3-2', nodeType: 'POLE', assetStatus: 'OLD', lineSection: 'HT', sequenceNumber: 1, nameLabel: 'HT-P-1', latitude: 22.5714, longitude: 88.3620, attributes: { cableSize: '100 sqmm ACSR', poleType: 'Concrete HT Pole', height: '11m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'TAP-1' },
      { id: 'hn-3-3', nodeType: 'POLE', assetStatus: 'NEW', lineSection: 'HT', sequenceNumber: 2, nameLabel: 'HT-P-2', latitude: 22.5718, longitude: 88.3620, attributes: { cableSize: '100 sqmm ACSR', poleType: 'Concrete HT Pole', height: '11m', tilt: '0°', sag: '0.4m' }, imageUri: null, capturedAt: '', parentLabel: 'HT-P-1' },
      { id: 'hn-3-4', nodeType: 'DTR', assetStatus: 'NEW', lineSection: 'HT', sequenceNumber: 3, nameLabel: 'DTR-100KVA', latitude: 22.5722, longitude: 88.3622, attributes: { cableSize: '11KV DTR Lead', poleType: 'Transformer Platform', height: '9m', tilt: '0°', sag: '0m' }, imageUri: null, capturedAt: '', parentLabel: 'HT-P-2' },
      { id: 'hn-3-5', nodeType: 'POLE', assetStatus: 'NEW', lineSection: 'LT', sequenceNumber: 4, nameLabel: 'LT-P-1', latitude: 22.5724, longitude: 88.3618, attributes: { cableSize: '90 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '0°', sag: '0.4m' }, imageUri: null, capturedAt: '', parentLabel: 'DTR-100KVA' },
      { id: 'hn-3-6', nodeType: 'POLE', assetStatus: 'OLD', lineSection: 'LT', sequenceNumber: 5, nameLabel: 'LT-P-2', latitude: 22.5727, longitude: 88.3615, attributes: { cableSize: '90 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '0°', sag: '0.4m' }, imageUri: null, capturedAt: '', parentLabel: 'LT-P-1' },
      { id: 'hn-3-7', nodeType: 'POLE', lineSection: 'LT', sequenceNumber: 6, nameLabel: 'LT-P-3', latitude: 22.5720, longitude: 88.3628, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '1°', sag: '0.2m' }, imageUri: null, capturedAt: '', parentLabel: 'DTR-100KVA' },
      { id: 'hn-3-8', nodeType: 'POLE', lineSection: 'LT', sequenceNumber: 7, nameLabel: 'LT-P-4', latitude: 22.5718, longitude: 88.3633, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'LT-P-3' },
      { id: 'hn-3-9', nodeType: 'POLE', lineSection: 'LT', sequenceNumber: 8, nameLabel: 'LT-P-5', latitude: 22.5715, longitude: 88.3637, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'LT-P-4' },
      { id: 'hn-3-10', nodeType: 'POLE', lineSection: 'LT', sequenceNumber: 9, nameLabel: 'LT-P-6', latitude: 22.5711, longitude: 88.3640, attributes: { cableSize: '75 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '0°', sag: '0.3m' }, imageUri: null, capturedAt: '', parentLabel: 'LT-P-5' },
      { id: 'hn-3-11', nodeType: 'POLE', lineSection: 'LT', sequenceNumber: 10, nameLabel: 'LT-P-7', latitude: 22.5717, longitude: 88.3642, attributes: { cableSize: '50 sqmm ABC', poleType: 'Concrete LT Pole', height: '9m', tilt: '0°', sag: '0.2m' }, imageUri: null, capturedAt: '', parentLabel: 'LT-P-4' }
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
    erectionList: [],
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
        delete state.activeLine.continuationParentLabel;
      }
    },
    resumeSurvey: (state, action: PayloadAction<{ lineId: string; parentLabel: string }>) => {
      const line = state.historyList.find(item => item.id === action.payload.lineId);
      if (!line || line.isCompleted) return;
      state.activeLine = {
        ...line,
        status: 'PENDING',
        nodes: line.nodes.map(node => ({ ...node, attributes: { ...node.attributes } })),
        editingExisting: true,
        continuationParentLabel: action.payload.parentLabel,
      };
    },
    cancelSurvey: (state) => {
      state.activeLine = null;
    },
    finishSurvey: (state) => {
      if (state.activeLine) {
        state.activeLine.endedAt = new Date().toISOString();
        const wasEditing = state.activeLine.editingExisting;
        delete state.activeLine.editingExisting;
        delete state.activeLine.continuationParentLabel;
        if (wasEditing) {
          const historyIndex = state.historyList.findIndex(line => line.id === state.activeLine?.id);
          if (historyIndex >= 0) state.historyList[historyIndex] = state.activeLine;
          const queueIndex = state.syncQueue.findIndex(line => line.id === state.activeLine?.id);
          if (queueIndex >= 0) state.syncQueue[queueIndex] = state.activeLine;
          else if (state.activeLine.status === 'PENDING') state.syncQueue.push(state.activeLine);
        } else {
          state.syncQueue.push(state.activeLine);
          state.historyList.unshift(state.activeLine);
        }
        state.activeLine = null;
      }
    },
    completeSurveyLine: (state, action: PayloadAction<string>) => {
      const completedAt = new Date().toISOString();
      const line = state.historyList.find(item => item.id === action.payload);
      if (line) {
        line.isCompleted = true;
        line.completedAt = completedAt;
      }
      const queueLine = state.syncQueue.find(item => item.id === action.payload);
      if (queueLine) {
        queueLine.isCompleted = true;
        queueLine.completedAt = completedAt;
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
      if (line && !line.isCompleted) {
        line.contractorName = action.payload.contractorName;
        line.remarks = action.payload.remarks;
        line.location = action.payload.location;
        line.block = action.payload.block;
        line.district = action.payload.district;
        line.preparedBy = action.payload.preparedBy;
      }
      const queueLine = state.syncQueue.find(l => l.id === action.payload.id);
      if (queueLine && !queueLine.isCompleted) {
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
      if (line && !line.isCompleted) {
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
      if (queueLine && !queueLine.isCompleted) {
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
        state.erectionList = action.payload.erectionList ?? [];
        const persistedHistory: SurveyLine[] = action.payload.historyList ?? [];
        const demoLine = initialHistory.find(line => line.id === 'hist-3');
        const persistedDemo = persistedHistory.find(line => line.id === demoLine?.id);
        const refreshedDemo = demoLine
          ? { ...demoLine, isCompleted: persistedDemo?.isCompleted, completedAt: persistedDemo?.completedAt }
          : undefined;
        state.historyList = refreshedDemo
          ? [refreshedDemo, ...persistedHistory.filter(line => line.id !== refreshedDemo.id)]
          : persistedHistory;
      }
    },
    setErectionList: (state, action: PayloadAction<any[]>) => {
      state.erectionList = action.payload;
    },
    updateErectionInList: (state, action: PayloadAction<any>) => {
      const idx = state.erectionList.findIndex(item => item.id === action.payload.id);
      if (idx !== -1) {
        state.erectionList[idx] = { ...state.erectionList[idx], ...action.payload };
      }
    },
    injectHistoryLine: (state, action: PayloadAction<SurveyLine>) => {
      const exists = state.historyList.some(l => l.id === action.payload.id);
      if (!exists) {
        state.historyList.unshift(action.payload);
      } else {
        state.historyList = state.historyList.map(l => 
          l.id === action.payload.id ? action.payload : l
        );
      }
    }
  },
});

// Slice 4: Master management data store
export interface MasterState {
  states: Array<{ id: number; state_code: string; state_name: string }>;
  districts: Array<{ id: number; state_id: number; district_name: string; district_code: string }>;
  blocks: Array<{ id: number; state_id: number; district_id: number; block_name: string; block_code: string }>;
  villages: Array<{ id: number; state_id: number; district_id: number; block_id: number; village_name: string; village_code: string }>;
  contractors: Array<{ id: number; contractor_name: string }>;
  domains: { [key: string]: Array<{ domain_id: number; domain_value: string; domain_code: string; domain_desc: string }> };
  transformers: Array<{ id: number; transformer_name: string; transformer_code: string }>;
  conductors: Array<{ id: number; conductor_name: string; conductor_code: string }>;
  poles: Array<{ id: number; pole_name: string; pole_code: string }>;
}

const initialMasterState: MasterState = {
  states: [],
  districts: [],
  blocks: [],
  villages: [],
  contractors: [],
  domains: {},
  transformers: [],
  conductors: [],
  poles: [],
};

const masterSlice = createSlice({
  name: 'master',
  initialState: initialMasterState,
  reducers: {
    setStates: (state, action: PayloadAction<MasterState['states']>) => {
      state.states = action.payload;
    },
    setDistricts: (state, action: PayloadAction<MasterState['districts']>) => {
      state.districts = action.payload;
    },
    setBlocks: (state, action: PayloadAction<MasterState['blocks']>) => {
      state.blocks = action.payload;
    },
    setVillages: (state, action: PayloadAction<MasterState['villages']>) => {
      state.villages = action.payload;
    },
    setContractors: (state, action: PayloadAction<MasterState['contractors']>) => {
      state.contractors = action.payload;
    },
    setDomains: (state, action: PayloadAction<{ [key: string]: any[] }>) => {
      state.domains = { ...state.domains, ...action.payload };
    },
    setTransformers: (state, action: PayloadAction<MasterState['transformers']>) => {
      state.transformers = action.payload;
    },
    setConductors: (state, action: PayloadAction<MasterState['conductors']>) => {
      state.conductors = action.payload;
    },
    setPoles: (state, action: PayloadAction<MasterState['poles']>) => {
      state.poles = action.payload;
    },
    clearMasterData: (state) => {
      state.states = [];
      state.districts = [];
      state.blocks = [];
      state.villages = [];
      state.contractors = [];
      state.domains = {};
      state.transformers = [];
      state.conductors = [];
      state.poles = [];
    }
  }
});

// Root Store
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    survey: surveySlice.reducer,
    master: masterSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { login, logout, updateProfileImage, updateToken, hydrateAuth } = authSlice.actions;
export const { startSurvey, resumeSurvey, addNode, cancelSurvey, finishSurvey, completeSurveyLine, clearQueueItem, clearAllCompleted, updateSurveyLineMetadata, updateSurveyNode, hydrateStore, setErectionList, updateErectionInList, injectHistoryLine } = surveySlice.actions;
export const { setStates, setDistricts, setBlocks, setVillages, setContractors, setDomains, setTransformers, setConductors, setPoles, clearMasterData } = masterSlice.actions;


const STORAGE_KEY = 'GIS_SURVEY_APP_STATE';

export const loadPersistedState = async () => {
  try {
    const serializedState = await AsyncStorage.getItem(STORAGE_KEY);
    let state = serializedState ? JSON.parse(serializedState) : undefined;

    // Check direct 'user' and 'token' in AsyncStorage
    const userStr = await AsyncStorage.getItem('user');
    const token = await AsyncStorage.getItem('token');

    if (userStr && token) {
      const parsedUser = JSON.parse(userStr);
      const userDetails = parsedUser?.Data?.user_details || {};
      
      if (!state) {
        state = {
          auth: {},
          survey: { activeLine: null, syncQueue: [], completedCount: 0, historyList: [], erectionList: [] }
        };
      }
      
      state.auth = {
        isLoggedIn: true,
        token: token,
        userId: userDetails.id || null,
        firstName: userDetails.first_name || '',
        lastName: userDetails.last_name || '',
        username: userDetails.username || '',
        phone: userDetails.phone || '',
        email: userDetails.email || '',
        roleName: userDetails.role_name || '',
        designationName: userDetails.designation_name || '',
        surveyorName: `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim(),
        surveyorId: `SRV-${userDetails.id || ''}`,
        division: userDetails.role_name || 'Central Division',
        profileImage: null
      };
    }
    return state;
  } catch (err) {
    console.error('Failed to load state:', err);
    return undefined;
  }
};

const saveState = async (state: any) => {
  try {
    if (!state.auth.isLoggedIn) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
    } else {
      const stateToSave = {
        auth: state.auth,
        survey: state.survey,
      };
      const serializedState = JSON.stringify(stateToSave);
      await AsyncStorage.setItem(STORAGE_KEY, serializedState);
    }
  } catch (err) {
    console.error('Failed to save state:', err);
  }
};

store.subscribe(() => {
  saveState(store.getState());
});
