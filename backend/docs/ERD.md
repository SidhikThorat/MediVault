classDiagram
  class User {
    walletAddress
    email
    name
    roles[]
    department
    patientRef -> Patient
    publicKey
    status
    passwordHash
    authProvider
    emailVerified
    mfaEnabled
    mfaSecretRef
    failedLoginCount
    lastLogin
    lastActiveAt
  }

  class Patient {
    patientId (unique)
    name
    dob
    gender
    identifiers[] (system,type,value)
    contact (phone,email)
    primaryDoctorId -> User
    consent (forResearch,consentDate)
  }

  class Document {
    patientId -> Patient
    uploaderId -> User
    title
    description
    modality [CT|X-RAY|DICOM|PDF|REPORT]
    studyInstanceUID
    seriesInstanceUID
    cidOrUrl
    fileHash
    fileSize
    mimeType
    encryption (encrypted,scheme,encryptedKey,keyRef,iv,tag)
    visibility [private|public|restricted]
    vectorMeta (vectorId)
    extractedTextRef -> TextChunk
    tags[]
    status [active|archived|deleted]
    docIdOnChain
    storage [ipfs|s3]
    version
    supersedesDocId -> Document
  }

  class AccessRequest {
    docId -> Document
    requesterId -> User
    requesterWallet
    reason
    status [pending|approved|rejected]
    reviewerId -> User
    reviewedAt
    onChainTx
    scope [read|download|share]
    messageToRequester
    expiresAt
  }

  class AuditLog {
    action
    performedBy -> User
    performedByWallet
    docId -> Document
    patientId -> Patient
    timestamp
    outcome [success|fail]
    meta (ip,userAgent,extra)
    onChainProof
    requestId
    sessionId
    actorRole
    documentVersion
  }

  class TextChunk {
    docId -> Document
    chunkIndex (unique per doc)
    text
    startOffset
    endOffset
    language
    source [ocr|pdf|dicom|other]
    textHash
  }

  class EmbeddingMap {
    docId -> Document
    chunkId -> TextChunk
    vectorId (unique)
    model
    embeddingDim
    provider
    indexName
    createdByModelVersion
  }

  class Notification {
    userId -> User
    type
    message
    read
    severity [info|warning|error]
    docId -> Document
    accessRequestId -> AccessRequest
    expiresAt
  }

  User "1" <-- "0..1" Patient : primaryDoctorId
  Patient "1" --> "0..*" Document : patientId
  User "1" --> "0..*" Document : uploaderId
  Document "1" --> "0..*" TextChunk : docId
  Document "1" --> "0..*" AccessRequest : docId
  User "1" --> "0..*" AccessRequest : requesterId/reviewerId
  Document "1" --> "0..*" AuditLog : docId
  User "1" --> "0..*" AuditLog : performedBy
  Patient "1" --> "0..*" AuditLog : patientId
  TextChunk "1" --> "0..*" EmbeddingMap : chunkId
  Document "1" --> "0..*" EmbeddingMap : docId
  Document "1" --> "0..1" Document : supersedesDocId
  User "1" --> "0..*" Notification : userId
  Document "0..1" --> "0..*" Notification : docId
  AccessRequest "0..1" --> "0..*" Notification : accessRequestId