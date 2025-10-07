-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    ipfs_hash VARCHAR(255) NOT NULL,
    blockchain_hash VARCHAR(66),
    checksum_sha256 VARCHAR(64) NOT NULL,
    encryption_key_id VARCHAR(255),
    uploader_id UUID NOT NULL REFERENCES users(id),
    patient_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    medical_metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create document_permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(document_id, user_id, permission_type)
);

-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    expires_at TIMESTAMP
);

-- Create document_versions table
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    ipfs_hash VARCHAR(255) NOT NULL,
    blockchain_hash VARCHAR(66),
    changes_description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_ipfs_hash ON documents(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_documents_blockchain_hash ON documents(blockchain_hash);

CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_permission_type ON document_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_document_permissions_is_active ON document_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_document_permissions_granted_at ON document_permissions(granted_at);

CREATE INDEX IF NOT EXISTS idx_access_requests_requester_id ON access_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_document_id ON access_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_access_requests_reviewed_by ON access_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check document access
CREATE OR REPLACE FUNCTION check_document_access(
    p_user_id UUID,
    p_document_id UUID,
    p_permission_type VARCHAR DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := FALSE;
    user_role VARCHAR;
    document_owner_id UUID;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    -- Get document owner
    SELECT uploader_id INTO document_owner_id FROM documents WHERE id = p_document_id;
    
    -- Admin has access to everything
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Document owner has access
    IF document_owner_id = p_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check explicit permissions
    SELECT EXISTS(
        SELECT 1 FROM document_permissions 
        WHERE document_id = p_document_id 
        AND user_id = p_user_id 
        AND permission_type = p_permission_type
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

