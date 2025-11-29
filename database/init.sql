-- SOS Emergency System Database Schema
-- Version: 4.0.0 (Phase 6)
-- PostgreSQL 15 + PostGIS

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Emergency contacts
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON emergency_contacts(user_id);

-- Emergency sessions
CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  workflow_id VARCHAR(100) UNIQUE,
  thread_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, resolved, cancelled
  emergency_type VARCHAR(50), -- medical, security, natural_disaster, accident, other
  severity INT CHECK (severity BETWEEN 1 AND 5),
  description TEXT NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emergencies_user ON emergencies(user_id, triggered_at DESC);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_workflow ON emergencies(workflow_id);
CREATE INDEX idx_emergencies_thread ON emergencies(thread_id);

-- Locations with PostGIS
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  location_name VARCHAR(255), -- "Home", "Office", etc.
  geom GEOMETRY(Point, 4326), -- PostGIS geometry column
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_emergency ON locations(emergency_id, timestamp DESC);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- Trigger to automatically set geom from lat/lng
CREATE OR REPLACE FUNCTION update_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_geom_trigger
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_location_geom();

-- AI assessments
CREATE TABLE ai_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,

  -- Situation Agent Output
  emergency_type VARCHAR(50),
  severity INT,
  immediate_risks TEXT[],
  recommended_response VARCHAR(50), -- self-help, contact_help, call_911
  situation_confidence DECIMAL(3, 2),

  -- Guidance Agent Output
  guidance_steps TEXT[],
  guidance_confidence DECIMAL(3, 2),

  -- Resource Agent Output
  nearby_hospitals TEXT[],
  emergency_services VARCHAR(50),
  additional_resources TEXT[],
  resource_confidence DECIMAL(3, 2),

  -- Orchestration Metadata
  agents_called TEXT[],
  total_tokens INT,
  execution_time_seconds DECIMAL(6, 3),
  model_used VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assessments_emergency ON ai_assessments(emergency_id);

-- Messages (two-way communication)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_type VARCHAR(20) NOT NULL, -- user, contact, system, ai
  sender_name VARCHAR(100),
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_emergency ON messages(emergency_id, created_at);
CREATE INDEX idx_messages_unread ON messages(emergency_id) WHERE read_at IS NULL;

-- Notifications log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES emergency_contacts(id),
  channel VARCHAR(20) NOT NULL, -- push, sms, email, websocket
  status VARCHAR(20) NOT NULL, -- sent, delivered, failed, read
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_emergency ON notifications(emergency_id, sent_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status);

-- System audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  emergency_id UUID REFERENCES emergencies(id),
  action VARCHAR(50) NOT NULL, -- trigger_emergency, resolve_emergency, send_message, etc.
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_emergency ON audit_log(emergency_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables with updated_at column
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER emergencies_updated_at BEFORE UPDATE ON emergencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data for development/testing
INSERT INTO users (email, password_hash, name, phone) VALUES
  ('demo@example.com', '$2b$10$X5j7JZz1F5vZ5vZ5vZ5vZ.vZ5vZ5vZ5vZ5vZ5vZ5vZ5vZ5vZ5vZ5u', 'Demo User', '+1234567890');
-- Password: demo123 (bcrypt hash)

COMMENT ON TABLE users IS 'User accounts for the SOS emergency system';
COMMENT ON TABLE emergencies IS 'Emergency sessions triggered by users';
COMMENT ON TABLE locations IS 'Location tracking data for emergencies';
COMMENT ON TABLE ai_assessments IS 'AI agent assessments for each emergency';
COMMENT ON TABLE messages IS 'Two-way communication messages';
COMMENT ON TABLE notifications IS 'Notification delivery tracking';
COMMENT ON TABLE audit_log IS 'System audit trail for security and debugging';

-- Grant permissions (adjust for your production setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sos_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sos_user;
