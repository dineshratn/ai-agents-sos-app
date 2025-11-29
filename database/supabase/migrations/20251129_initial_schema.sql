-- SOS Emergency System - Supabase Migration
-- Version: 4.0.0 (Phase 6 - Supabase Edition)
-- Description: Initial database schema with Supabase Auth integration

-- Enable PostGIS extension (available in Supabase)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Emergency Contacts Table
-- ============================================
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON emergency_contacts(user_id);

-- RLS Policies for emergency_contacts
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts"
  ON emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts"
  ON emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Emergency Sessions Table
-- ============================================
CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workflow_id VARCHAR(100) UNIQUE,
  thread_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  emergency_type VARCHAR(50),
  severity INT CHECK (severity BETWEEN 1 AND 5),
  description TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emergencies_user ON emergencies(user_id, triggered_at DESC);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_workflow ON emergencies(workflow_id);
CREATE INDEX idx_emergencies_thread ON emergencies(thread_id);

-- RLS Policies for emergencies
ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emergencies"
  ON emergencies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergencies"
  ON emergencies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergencies"
  ON emergencies FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Locations Table (with PostGIS)
-- ============================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  location_name VARCHAR(255),
  geom GEOGRAPHY(Point, 4326),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_locations_emergency ON locations(emergency_id, timestamp DESC);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- Trigger to automatically set geom from lat/lng
CREATE OR REPLACE FUNCTION update_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_geom_trigger
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_location_geom();

-- RLS Policies for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations for their emergencies"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = locations.emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create locations for their emergencies"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

-- ============================================
-- AI Assessments Table
-- ============================================
CREATE TABLE ai_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,

  -- Situation Agent Output
  emergency_type VARCHAR(50),
  severity INT,
  immediate_risks TEXT[],
  recommended_response VARCHAR(50),
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

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessments_emergency ON ai_assessments(emergency_id);

-- RLS Policies for ai_assessments
ALTER TABLE ai_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assessments for their emergencies"
  ON ai_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = ai_assessments.emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assessments for their emergencies"
  ON ai_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

-- ============================================
-- Messages Table
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type VARCHAR(20) NOT NULL,
  sender_name VARCHAR(100),
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_emergency ON messages(emergency_id, created_at);
CREATE INDEX idx_messages_unread ON messages(emergency_id) WHERE read_at IS NULL;

-- RLS Policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their emergencies"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = messages.emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their emergencies"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

-- ============================================
-- Notifications Table
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES emergency_contacts(id),
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_emergency ON notifications(emergency_id, sent_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status);

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications for their emergencies"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emergencies
      WHERE emergencies.id = notifications.emergency_id
      AND emergencies.user_id = auth.uid()
    )
  );

-- ============================================
-- Audit Log Table
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  emergency_id UUID REFERENCES emergencies(id),
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_emergency ON audit_log(emergency_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- RLS Policies for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- User Profiles Table (extends auth.users)
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- Triggers
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER emergencies_updated_at BEFORE UPDATE ON emergencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Functions
-- ============================================

-- Get user's active emergencies
CREATE OR REPLACE FUNCTION get_active_emergencies(user_uuid UUID)
RETURNS SETOF emergencies AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM emergencies
  WHERE user_id = user_uuid AND status = 'active'
  ORDER BY triggered_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get emergency with full details
CREATE OR REPLACE FUNCTION get_emergency_details(emergency_uuid UUID)
RETURNS TABLE (
  emergency_data JSONB,
  locations_data JSONB,
  assessment_data JSONB,
  messages_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(e.*) as emergency_data,
    COALESCE(jsonb_agg(DISTINCT l.*) FILTER (WHERE l.id IS NOT NULL), '[]'::jsonb) as locations_data,
    COALESCE(jsonb_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb) as assessment_data,
    COALESCE(jsonb_agg(DISTINCT m.*) FILTER (WHERE m.id IS NOT NULL), '[]'::jsonb) as messages_data
  FROM emergencies e
  LEFT JOIN locations l ON l.emergency_id = e.id
  LEFT JOIN ai_assessments a ON a.emergency_id = e.id
  LEFT JOIN messages m ON m.emergency_id = e.id
  WHERE e.id = emergency_uuid
  GROUP BY e.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE emergency_contacts IS 'Emergency contacts for each user';
COMMENT ON TABLE emergencies IS 'Emergency sessions triggered by users';
COMMENT ON TABLE locations IS 'Location tracking data with PostGIS support';
COMMENT ON TABLE ai_assessments IS 'AI multi-agent assessment results';
COMMENT ON TABLE messages IS 'Two-way communication during emergencies';
COMMENT ON TABLE notifications IS 'Notification delivery tracking';
COMMENT ON TABLE audit_log IS 'Security and activity audit trail';
COMMENT ON TABLE user_profiles IS 'Extended user profile data (supplements auth.users)';

-- ============================================
-- Realtime Configuration (Supabase specific)
-- ============================================

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
