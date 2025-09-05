# Requirements Document

## Introduction

This feature addresses critical issues in the company management system related to owner permission verification and request deduplication. Currently, company owners are unable to accept join requests due to faulty permission checks, and duplicate requests from the same user are appearing in the requests list, creating confusion and poor user experience.

## Requirements

### Requirement 1

**User Story:** As a company owner, I want to be able to accept or reject join requests to my company, so that I can manage who has access to my business data.

#### Acceptance Criteria

1. WHEN a user is the company owner (propietario field matches user.uid) THEN the system SHALL display accept/reject buttons for pending requests
2. WHEN a user has 'owner' role in the company members table THEN the system SHALL display accept/reject buttons for pending requests  
3. WHEN a user is the company owner by email (propietario field matches user.email) THEN the system SHALL display accept/reject buttons for pending requests
4. WHEN an owner clicks "Aceptar acceso" THEN the system SHALL add the requester as a company member and update the request status to 'aceptada'
5. WHEN an owner clicks "Rechazar" THEN the system SHALL update the request status to 'rechazada'

### Requirement 2

**User Story:** As a company owner, I want to see only one request per user, so that I don't get confused by duplicate entries and can make clear decisions.

#### Acceptance Criteria

1. WHEN multiple requests exist from the same user (same solicitanteId) THEN the system SHALL display only the most recent request
2. WHEN multiple requests exist from the same user (same email) THEN the system SHALL display only the most recent request
3. WHEN the requests list loads THEN the system SHALL deduplicate requests using both solicitanteId and email as unique identifiers
4. WHEN real-time updates occur THEN the system SHALL maintain deduplication in the live listener
5. WHEN a request is processed (accepted/rejected) THEN all duplicate requests from the same user SHALL be updated to the same status

### Requirement 3

**User Story:** As a developer, I want clear debugging information about permission checks, so that I can quickly identify and fix authorization issues.

#### Acceptance Criteria

1. WHEN permission checks are performed THEN the system SHALL log relevant debug information including company owner, user ID, user email, and user role
2. WHEN deduplication occurs THEN the system SHALL log the number of total requests and unique requests after processing
3. WHEN a user's role is loaded THEN the system SHALL log the user's role in the company
4. IF permission checks fail THEN the system SHALL log why the user doesn't have owner permissions
5. WHEN debugging is complete and functionality is verified THEN debug logging SHALL be removed or made conditional

### Requirement 4

**User Story:** As a company owner, I want the system to work reliably across different scenarios, so that I can manage my company regardless of how the ownership was established.

#### Acceptance Criteria

1. WHEN a company was created with user.uid as propietario THEN owner verification SHALL work correctly
2. WHEN a company was created with user.email as propietario THEN owner verification SHALL work correctly  
3. WHEN a user is added as 'owner' role in members table THEN owner verification SHALL work correctly
4. WHEN ownership is established through any valid method THEN all owner functions SHALL be available
5. WHEN the system loads company data THEN it SHALL verify user permissions using all available methods