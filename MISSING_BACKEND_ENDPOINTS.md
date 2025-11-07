# Missing Backend Endpoints

This document lists frontend functionalities that require backend API endpoints that are **NOT** currently available in the backend API specification.

## Last Updated

November 5, 2025

---

## Missing Endpoints

### 1. Get Notebooks by Member

**Frontend Need:** Load all notebooks where the current user is a member (including notebooks they don't own)

**Current Frontend Usage:**

- `src/stores/notebook.ts` - `loadAllUserNotebooks()` function
- Used to display shared notebooks in the sidebar

**Required Backend Endpoint:**

```
POST /api/Notebook/_getNotebooksByMember
```

**Request Body:**

```json
{
  "member": "ID"
}
```

**Expected Response:**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "description": "string",
    "members": ["ID"],
    "recipes": ["ID"],
    "created": "string (ISO 8601)"
  }
]
```

**Description:** Returns all notebooks where the specified user ID is in the `members` array. This is needed to display shared notebooks to users who are not the owner.

**Priority:** HIGH - Critical for the shared notebooks feature described in the user journey

**Workaround:** Currently, the frontend can only load notebooks owned by the user. Shared notebooks cannot be discovered.

---

## Notes on Backend API Spec Alignment

The following frontend features were removed or modified because they don't match the backend:

### ✅ Removed from Frontend:

1. **Version Concept** - The frontend had a Version store and API, but this doesn't exist in the backend spec
2. **VersionDraft Concept** - Similar to Version, this was frontend-only

### ✅ Migrated to Recipe API:

The AI functionality is now correctly using:

- `POST /api/Recipe/draftRecipeWithAI` - Generate AI draft
- `POST /api/Recipe/applyDraft` - Apply AI draft to recipe

### ✅ Session-Based Authentication:

- Frontend now uses session tokens returned from login
- Session tokens are automatically injected into all protected endpoint requests
- No more sending `owner`, `author`, or `requester` fields from frontend (backend derives from session)

---

## Recommendations

### For Immediate Implementation:

Implement the `_getNotebooksByMember` endpoint to enable the full collaborative notebook experience described in the user journey.

### Alternative Approaches (if backend changes are blocked):

1. **Client-side filtering:** Have the frontend query all notebooks and filter client-side (not scalable)
2. **Modified UX:** Remove the "Shared Notebooks" feature and only show notebooks the user owns
3. **Polling:** Have users manually enter notebook IDs to view shared notebooks

---

## Backend Consistency Notes

The backend API spec is well-structured and follows these patterns:

✅ **Public Query Endpoints** (prefixed with `_`) - No session required
✅ **Protected Action Endpoints** - Require session, backend derives user identity
✅ **Consistent Response Format** - Query endpoints return arrays, Action endpoints return objects with IDs
✅ **Session Token Management** - Proper session lifecycle with 7-day expiration

The only missing piece is the member-based notebook query, which is a natural complement to the existing `_getNotebooksByOwner` endpoint.
