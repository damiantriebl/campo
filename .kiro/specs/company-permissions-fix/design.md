# Design Document

## Overview

This design addresses critical issues in the company management system by implementing robust owner permission verification and request deduplication. The solution enhances the existing permission checking logic and implements a multi-key deduplication strategy to ensure reliable company management functionality.

## Architecture

### Current System Analysis

The current system has the following components:
- **Company Model**: Contains `propietario` field (string) for owner identification
- **CompanyMember Model**: Contains `role` field ('owner' | 'member') for role-based permissions
- **CompanyJoinRequest Model**: Contains `solicitanteId` and `solicitanteEmail` for request identification
- **Permission Verification**: Currently only checks `company.propietario === user.uid`

### Proposed Enhancements

1. **Multi-Method Owner Verification**: Implement comprehensive permission checking using three verification methods
2. **Robust Request Deduplication**: Use composite keys for reliable duplicate detection
3. **Enhanced Data Loading**: Load user roles alongside company data for complete context
4. **Debugging Infrastructure**: Temporary logging for verification and troubleshooting

## Components and Interfaces

### 1. Enhanced Permission Verification

```typescript
interface OwnerVerificationContext {
  company: Company;
  user: AuthUser;
  userRole: string | null;
}

interface PermissionCheckResult {
  isOwner: boolean;
  verificationMethod: 'propietario_uid' | 'propietario_email' | 'member_role' | 'none';
  debugInfo: {
    companyOwner: string;
    userUid: string;
    userEmail: string;
    userRole: string | null;
  };
}
```

### 2. Request Deduplication System

```typescript
interface DeduplicationKey {
  solicitanteId: string;
  solicitanteEmail: string;
}

interface DeduplicationResult {
  uniqueRequests: CompanyJoinRequest[];
  duplicatesRemoved: number;
  debugInfo: {
    totalRequests: number;
    uniqueRequests: number;
    deduplicationKeys: string[];
  };
}
```

### 3. Enhanced Request Management State

```typescript
interface RequestsScreenState {
  company: Company | null;
  requests: CompanyJoinRequest[];
  userRole: string | null;
  loading: boolean;
  processingRequests: Set<string>;
  debugMode: boolean; // Temporary for troubleshooting
}
```

## Data Models

### Enhanced CompanyMember Query

The system will query company members to determine user roles:

```typescript
// Enhanced member lookup
const members = await getCompanyMembers(empresaId);
const userMember = members.find(member => member.userId === user.uid);
const userRole = userMember?.role || null;
```

### Request Deduplication Logic

```typescript
// Composite key deduplication
const uniqueRequestsMap = new Map<string, CompanyJoinRequest>();
requests.forEach(request => {
  const key = `${request.solicitanteId}_${request.solicitanteEmail}`;
  if (!uniqueRequestsMap.has(key) || 
      request.creado > uniqueRequestsMap.get(key)!.creado) {
    uniqueRequestsMap.set(key, request);
  }
});
```

## Error Handling

### Permission Verification Errors

1. **Missing User Context**: Handle cases where user is not authenticated
2. **Missing Company Data**: Handle cases where company data fails to load
3. **Member Query Failures**: Graceful fallback when member data is unavailable
4. **Role Resolution Conflicts**: Handle cases where multiple verification methods conflict

### Deduplication Errors

1. **Invalid Request Data**: Handle requests with missing solicitanteId or email
2. **Timestamp Comparison Failures**: Fallback sorting when timestamp comparison fails
3. **Memory Constraints**: Handle large numbers of duplicate requests efficiently

### Error Recovery Strategies

```typescript
// Graceful permission fallback
const isOwner = user && company && (
  // Primary verification methods
  company.propietario === user.uid ||
  company.propietario === user.email ||
  userRole === 'owner'
) || false; // Explicit fallback to false

// Deduplication error handling
try {
  const uniqueRequests = deduplicateRequests(requests);
  setRequests(uniqueRequests);
} catch (error) {
  console.error('Deduplication failed, using original requests:', error);
  setRequests(requests); // Fallback to original data
}
```

## Testing Strategy

### Unit Testing

1. **Permission Verification Tests**
   - Test each verification method independently
   - Test combined verification scenarios
   - Test edge cases (missing data, null values)

2. **Deduplication Logic Tests**
   - Test single user multiple requests
   - Test multiple users single requests
   - Test timestamp-based selection
   - Test malformed request data

### Integration Testing

1. **End-to-End Permission Flow**
   - Test owner can accept/reject requests
   - Test non-owner cannot see action buttons
   - Test role changes update permissions in real-time

2. **Real-time Deduplication**
   - Test deduplication with live Firestore updates
   - Test concurrent request creation scenarios
   - Test network interruption recovery

### Performance Testing

1. **Large Request Lists**: Test deduplication performance with 100+ requests
2. **Frequent Updates**: Test real-time listener performance with rapid changes
3. **Memory Usage**: Monitor memory consumption during deduplication operations

## Implementation Phases

### Phase 1: Enhanced Permission Verification
- Implement multi-method owner verification
- Add user role loading to requests screen
- Update permission checks in UI components

### Phase 2: Robust Request Deduplication  
- Implement composite key deduplication
- Update both initial load and real-time listener
- Add deduplication performance monitoring

### Phase 3: Debug Infrastructure
- Add comprehensive debug logging
- Implement debug mode toggle
- Create debugging utilities for troubleshooting

### Phase 4: Testing and Validation
- Implement comprehensive test suite
- Perform end-to-end validation
- Remove or conditionalize debug logging

## Security Considerations

### Permission Verification Security
- Ensure all verification methods are server-side validated
- Prevent client-side permission bypassing
- Audit permission changes and access attempts

### Data Privacy
- Limit debug logging in production environments
- Ensure user data is not exposed in logs
- Implement proper data sanitization

### Request Processing Security
- Validate request ownership before processing
- Prevent duplicate request processing
- Ensure atomic request status updates

## Performance Optimizations

### Efficient Member Queries
- Cache user roles for session duration
- Batch member queries when possible
- Use indexed queries for role lookups

### Optimized Deduplication
- Use Map-based deduplication for O(n) performance
- Minimize object creation during deduplication
- Implement lazy loading for large request lists

### Real-time Update Efficiency
- Debounce rapid real-time updates
- Use incremental updates when possible
- Optimize listener query constraints