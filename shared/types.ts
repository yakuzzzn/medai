// Shared TypeScript types for AI Medical Scribe

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'doctor' | 'nurse' | 'admin';
  clinicId: string;
  fhirPractitionerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface Clinic {
  id: string;
  name: string;
  fhirOrganizationId?: string;
  region: string;
  timezone: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AudioRecording {
  id: string;
  userId: string;
  clinicId: string;
  patientId?: string;
  encounterId?: string;
  filePath: string;
  fileSize: number;
  durationSeconds: number;
  encryptionKeyId?: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  audioId: string;
  rawText: string;
  confidenceScore?: number;
  wordErrorRate?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ConfidenceScores {
  subjective: number;
  objective: number;
  assessment: number;
  plan: number;
}

export interface ICDCode {
  code: string;
  description: string;
  confidence: number;
}

export interface RxCode {
  code: string;
  description: string;
  confidence: number;
}

export interface Draft {
  id: string;
  transcriptId: string;
  userId: string;
  clinicId: string;
  soapData: SOAPData;
  confidenceScores: ConfidenceScores;
  icdCodes?: ICDCode[];
  rxCodes?: RxCode[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  draftId: string;
  userId: string;
  clinicId: string;
  fhirObservationId?: string;
  fhirEncounterId?: string;
  soapData: SOAPData;
  icdCodes?: ICDCode[];
  rxCodes?: RxCode[];
  syncStatus: 'pending' | 'syncing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  clinicId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// API Request/Response types
export interface UploadAudioRequest {
  file: File;
  patientId?: string;
  encounterId?: string;
  metadata?: Record<string, any>;
}

export interface UploadAudioResponse {
  audioId: string;
  uploadStatus: string;
  estimatedProcessingTime: number;
}

export interface GetDraftResponse {
  draft: Draft;
  transcript: Transcript;
  audio: AudioRecording;
}

export interface UpdateDraftRequest {
  soapData: Partial<SOAPData>;
  icdCodes?: ICDCode[];
  rxCodes?: RxCode[];
}

export interface SyncToEHRRequest {
  draftId: string;
  fhirEncounterId?: string;
  fhirPatientId?: string;
}

export interface SyncToEHRResponse {
  noteId: string;
  fhirObservationId?: string;
  fhirEncounterId?: string;
  syncStatus: string;
}

export interface CodingSuggestion {
  type: 'icd' | 'rx';
  code: string;
  description: string;
  confidence: number;
  context: string;
}

export interface GetCodingSuggestionsRequest {
  text: string;
  type: 'icd' | 'rx';
  limit?: number;
}

export interface GetCodingSuggestionsResponse {
  suggestions: CodingSuggestion[];
}

// FHIR types
export interface FHIRPatient {
  id: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name?: Array<{
    use: string;
    text: string;
    family: string;
    given: string[];
  }>;
  birthDate?: string;
  gender?: string;
}

export interface FHIRPractitioner {
  id: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  name?: Array<{
    use: string;
    text: string;
    family: string;
    given: string[];
  }>;
  telecom?: Array<{
    system: string;
    value: string;
    use?: string;
  }>;
}

export interface FHIREncounter {
  id: string;
  status: string;
  class: {
    system: string;
    code: string;
    display: string;
  };
  subject: {
    reference: string;
  };
  participant?: Array<{
    type?: Array<{
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    }>;
    individual: {
      reference: string;
    };
  }>;
  period?: {
    start: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
}

export interface FHIRObservation {
  id: string;
  status: string;
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  encounter?: {
    reference: string;
  };
  effectiveDateTime?: string;
  issued?: string;
  performer?: Array<{
    reference: string;
  }>;
  valueString?: string;
  component?: Array<{
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    valueString?: string;
  }>;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export interface DraftReadyEvent extends WebSocketEvent {
  type: 'draft_ready';
  payload: {
    draftId: string;
    userId: string;
    clinicId: string;
  };
}

export interface ProcessingStatusEvent extends WebSocketEvent {
  type: 'processing_status';
  payload: {
    audioId: string;
    status: string;
    progress?: number;
  };
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Feature flags
export interface FeatureFlags {
  enableAdvancedCoding: boolean;
  enableRealTimeTranscription: boolean;
  enableMultiLanguage: boolean;
  enableAnalytics: boolean;
  enableAdminPanel: boolean;
}

// Constants
export const PROCESSING_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const UPLOAD_STATUSES = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const SYNC_STATUSES = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const USER_ROLES = {
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  ADMIN: 'admin',
} as const; 