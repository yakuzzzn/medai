-- AI Medical Scribe Database Schema
-- GDPR compliant with audit trails and data retention policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (clinic staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'nurse', 'admin')),
    clinic_id UUID NOT NULL,
    fhir_practitioner_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Clinics table
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    fhir_organization_id VARCHAR(255),
    region VARCHAR(50) DEFAULT 'eu-central-1',
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio recordings table
CREATE TABLE audio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    patient_id VARCHAR(255), -- FHIR Patient ID
    encounter_id VARCHAR(255), -- FHIR Encounter ID
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    encryption_key_id VARCHAR(255),
    upload_status VARCHAR(50) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_id UUID NOT NULL REFERENCES audio(id),
    raw_text TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    word_error_rate DECIMAL(3,2),
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft notes table
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    soap_data JSONB NOT NULL, -- {subjective, objective, assessment, plan}
    confidence_scores JSONB NOT NULL, -- {subjective: 0.95, objective: 0.87, ...}
    icd_codes JSONB, -- [{code: "I10", description: "Essential hypertension"}, ...]
    rx_codes JSONB, -- [{code: "123456", description: "Lisinopril"}, ...]
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Final notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID NOT NULL REFERENCES drafts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    fhir_observation_id VARCHAR(255),
    fhir_encounter_id VARCHAR(255),
    soap_data JSONB NOT NULL,
    icd_codes JSONB,
    rx_codes JSONB,
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table (immutable append-only)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    clinic_id UUID REFERENCES clinics(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_clinic_id ON users(clinic_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audio_user_id ON audio(user_id);
CREATE INDEX idx_audio_clinic_id ON audio(clinic_id);
CREATE INDEX idx_audio_created_at ON audio(created_at);
CREATE INDEX idx_transcripts_audio_id ON transcripts(audio_id);
CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_drafts_clinic_id ON drafts(clinic_id);
CREATE INDEX idx_drafts_created_at ON drafts(created_at);
CREATE INDEX idx_notes_draft_id ON notes(draft_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_clinic_id ON notes(clinic_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_clinic_id ON audit_log(clinic_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Full-text search indexes
CREATE INDEX idx_transcripts_raw_text_gin ON transcripts USING gin(to_tsvector('english', raw_text));
CREATE INDEX idx_drafts_soap_data_gin ON drafts USING gin(soap_data);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_updated_at BEFORE UPDATE ON audio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data retention policies (GDPR compliance)
-- Audio files: 24 hours (temporary storage)
-- Transcripts: 30 days (processing purposes)
-- Drafts: 90 days (review purposes)
-- Notes: 7 years (legal requirement)
-- Audit logs: 10 years (compliance)

-- Partition audit_log by year for better performance
CREATE TABLE audit_log_2024 PARTITION OF audit_log FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE audit_log_2025 PARTITION OF audit_log FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Insert seed data
INSERT INTO clinics (id, name, fhir_organization_id, region) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Central Medical Clinic', 'org-001', 'eu-central-1'),
('550e8400-e29b-41d4-a716-446655440002', 'Downtown Healthcare', 'org-002', 'eu-central-1');

INSERT INTO users (id, email, first_name, last_name, role, clinic_id) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 'dr.smith@centralclinic.com', 'John', 'Smith', 'doctor', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440004', 'dr.jones@centralclinic.com', 'Sarah', 'Jones', 'doctor', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440005', 'admin@centralclinic.com', 'Admin', 'User', 'admin', '550e8400-e29b-41d4-a716-446655440001'); 