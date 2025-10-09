classDiagram
  class User {
    walletAddress : string
    email : string
    name : string
    roles : string[]
    department : string
    patientRefId : string
    publicKey : string
    status : string
    passwordHash : string
    authProvider : string
    emailVerified : bool
    mfaEnabled : bool
    mfaSecretRef : string
    failedLoginCount : int
    lastLogin : datetime
    lastActiveAt : datetime
  }

  class Patient {
    patientId : string  %% unique
    name : string
    dob : date
    gender : string
    identifiers : array<SystemTypeValue>
    contact : object
    primaryDoctorId : string
    consent : object
  }

  class Document {
    docId : string
    patientId : string
    uploaderId : string
    title : string
    description : string
    modality : enum(CT, X-RAY, DICOM, PDF, REPORT)
    studyInstanceUID : string
    seriesInstanceUID : string
    cidOrUrl : string
    fileHash : string
    fileSize : int
    mimeType : string
    encryption : object
    visibility : enum(private, public, restricted)
    vectorMeta : object
    extractedTextRef : string
    tags : string[]
    status : enum(active, archived, deleted)
    docIdOnChain : string
    storage : enum(ipfs, s3)
    version : string
    supersedesDocId : string
  }

  class AccessRequest {
    requestId : string
    docId : string
    requesterId : string
    requesterWallet : string
    reason : string
    status : enum(pending, approved, rejected)
    reviewerId : string
    reviewedAt : datetime
    onChainTx : string
    scope : enum(read, download, share)
    messageToRequester : string
    expiresAt : datetime
  }

  class AuditLog {
    action : string
    performedBy : string
    performedByWallet : string
    docId : string
    patientId : string
    timestamp : datetime
    outcome : enum(success, fail)
    meta : object
    onChainProof : string
    requestId : string
    sessionId : string
    actorRole : string
    documentVersion : string
  }

  class TextChunk {
    docId : string
    chunkIndex : int
    text : string
    startOffset : int
    endOffset : int
    language : string
    source : enum(ocr, pdf, dicom, other)
    textHash : string
  }

  class EmbeddingMap {
    vectorId : string
    docId : string
    chunkId : string
    model : string
    embeddingDim : int
    provider : string
    indexName : string
    createdByModelVersion : string
  }

  class Notification {
    notificationId : string
    userId : string
    type : string
    message : string
    read : bool
    severity : enum(info, warning, error)
    docId : string
    accessRequestId : string
    expiresAt : datetime
  }

  %% relationships (multiplicities and labels)
  User "1" <-- "0..1" Patient : primaryDoctorId
  Patient "1" --> "0..*" Document : patientId
  User "1" --> "0..*" Document : uploaderId
  Document "1" --> "0..*" TextChunk : docId
  Document "1" --> "0..*" AccessRequest : docId
  User "1" --> "0..*" AccessRequest : requesterId / reviewerId
  Document "1" --> "0..*" AuditLog : docId
  User "1" --> "0..*" AuditLog : performedBy
  Patient "1" --> "0..*" AuditLog : patientId
  TextChunk "1" --> "0..*" EmbeddingMap : chunkId
  Document "1" --> "0..*" EmbeddingMap : docId
  Document "1" --> "0..1" Document : supersedesDocId
  User "1" --> "0..*" Notification : userId
  Document "0..1" --> "0..*" Notification : docId
  AccessRequest "0..1" --> "0..*" Notification : accessRequestId
