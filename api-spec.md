# Nibble Backend API Specification

**Base URL:** `http://localhost:10000/api`  
**Protocol:** All endpoints accept POST requests with JSON request bodies and return JSON responses.
**Last Updated:** November 5, 2025

---

## 🔐 Authentication

### Session-Based Authentication

Most endpoints require a **session token** obtained from login. Include it in the request body:

```json
{
  "session": "your-session-token-here"
  // ... other parameters
}
```

**Session Lifecycle:**

- **Obtain:** Login returns a session token
- **Duration:** 7 days (auto-expires)
- **Use:** Include in all protected endpoints
- **Destroy:** Logout via `/api/Sessioning/deleteSession`

### Endpoint Types:

- 🔓 **Public** - No session required
- 🔒 **Protected** - Session required
- 🔑 **Authorized** - Session + ownership/membership check

### ⚠️ Critical Security Note:

**NEVER send `author`, `owner`, or `requester` fields from the frontend!**

The backend automatically derives user identity from the authenticated session token. Sending these fields from the frontend is:

- ❌ Ignored by the backend (session takes precedence)
- ❌ A security risk (could lead to impersonation attempts)
- ❌ Unnecessary (backend handles it)

**Correct:** Send only `session` token  
**Incorrect:** Send `session` + `author`/`owner`/`requester`

---

## Table of Contents

1. [User & Authentication](#user--authentication)
2. [Session Management](#session-management)
3. [Recipe Concept](#recipe-concept)
4. [Notebook Concept](#notebook-concept)
5. [Annotation Concept](#annotation-concept)

---

## User & Authentication

**Purpose:** User management and authentication

### POST /api/User/registerUser

🔓 **Public** - No session required

**Description:** Creates a new user account.

**Requirements:**

- no user with the given `username` already exists.
- `name` and `password` are non-empty strings.

**Effects:**

- creates a new user, stores `name`, `username`, and `passwordHash` (plain password for this exercise);
- initializes `preferences` to an empty map;
- returns the `ID` of the newly created user.

**Request Body:**

```json
{
  "name": "string",
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/User/login

🔓 **Public** - Returns session token for authenticated requests

**Description:** Authenticates a user and creates a session.

**Requirements:**

- User with the given `username` and `password` exists.

**Effects:**

- Validates credentials
- Creates a session (7-day expiration)
- Returns user ID and session token

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body:**

```json
{
  "user": "ID",
  "session": "SESSION_TOKEN"
}
```

**Error Response Body:**

```json
{
  "error": "Invalid username or password"
}
```

**💡 Important:** Save the `session` token and include it in all protected endpoint requests.

---

### POST /api/User/updateProfile

**Description:** Updates the profile information for a specified user.

**Requirements:**

- the `user` identified by `user: ID` must exist.
- If `newUsername` is provided, it must be unique among other users.

**Effects:**

- updates the `name`, `username`, and/or `preferences` for the specified user.
- Returns an empty object on success.

**Request Body:**

```json
{
  "user": "ID",
  "newName": "string",
  "newUsername": "string",
  "newPreferences": {
    "key": "any"
  }
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/User/\_getUserDetails

**Description:** Returns the details (name, username, preferences) of the specified user.

**Requirements:**

- a user with the given `user: ID` exists.

**Effects:**

- returns the details (name, username, preferences) of the specified user.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": {
      "name": "string",
      "username": "string",
      "preferences": {
        "key": "any"
      }
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/User/\_getUserIDByUsername

**Description:** Returns the ID of the user with the specified username.

**Requirements:**

- a user with the given `username` exists.

**Effects:**

- returns the ID of the user with the specified username.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "ID"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

## Session Management

**Purpose:** Manage user sessions for authentication

### POST /api/Sessioning/deleteSession

🔓 **Public** - Destroys a session (logout)

**Description:** Ends a user session.

**Request Body:**

```json
{
  "session": "SESSION_TOKEN"
}
```

**Success Response Body:**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "Session not found"
}
```

---

## Recipe Concept

**Purpose:** represent a canonical recipe owned by a user, with its core ingredients, steps, and descriptive metadata.

### POST /api/Recipe/createRecipe

**Description:** Adds a new recipe with an empty tag set, sets creation and update times, and returns the new recipe's ID. Optionally tracks the parent recipe if this recipe is forked from another.

**Requirements:**

- owner exists; title ≠ ""; ingredients and steps well-formed; if forkedFrom is provided, that recipe must exist

**Effects:**

- adds new recipe with empty tag set, sets creation/update times; optionally tracks the parent recipe if forkedFrom is provided; returns the new recipe's ID

**Request Body:**

```json
{
  "owner": "ID",
  "title": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string (optional)",
      "notes": "string (optional)"
    }
  ],
  "steps": [
    {
      "description": "string",
      "notes": "string (optional)"
    }
  ],
  "description": "string (optional)",
  "forkedFrom": "ID (optional)"
}
```

**Success Response Body (Action):**

```json
{
  "recipe": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/addTag

**Description:** Adds a tag to an existing recipe.

**Requirements:**

- recipe exists

**Effects:**

- tag ∈ recipe.tags

**Request Body:**

```json
{
  "recipe": "ID",
  "tag": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/removeTag

**Description:** Removes a tag from an existing recipe.

**Requirements:**

- tag ∈ recipe.tags

**Effects:**

- tag ∉ recipe.tags

**Request Body:**

```json
{
  "recipe": "ID",
  "tag": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/deleteRecipe

**Description:** Removes a recipe and triggers cascade deletion of related Versions and Annotations (via sync).

**Requirements:**

- requester = recipe.owner

**Effects:**

- removes recipe and triggers cascade deletion of related Versions and Annotations (via sync)

**Request Body:**

```json
{
  "requester": "ID",
  "recipe": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/updateRecipeDetails

**Description:** Updates specified fields of a recipe and its `updated` timestamp.

**Requirements:**

- owner = recipe.owner

**Effects:**

- updates specified fields and `updated` timestamp.

**Request Body:**

```json
{
  "owner": "ID",
  "recipe": "ID",
  "newTitle": "string (optional)",
  "newDescription": "string (optional)",
  "newIngredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string (optional)",
      "notes": "string (optional)"
    }
  ],
  "newSteps": [
    {
      "description": "string",
      "notes": "string (optional)"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/\_getRecipeById

**Description:** Returns the full Recipe document for a given recipe ID.

**Requirements:**

- recipe exists

**Effects:**

- returns the full Recipe document

**Request Body:**

```json
{
  "recipe": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "recipe": {
      "_id": "ID",
      "owner": "ID",
      "title": "string",
      "description": "string (optional)",
      "ingredients": [
        {
          "name": "string",
          "quantity": "string",
          "unit": "string (optional)",
          "notes": "string (optional)"
        }
      ],
      "steps": [
        {
          "description": "string",
          "notes": "string (optional)"
        }
      ],
      "tags": ["string"],
      "forkedFrom": "ID (optional)",
      "created": "Date (ISO 8601 string)",
      "updated": "Date (ISO 8601 string)"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/\_listRecipesByOwner

**Description:** Returns all recipes owned by the specified user.

**Requirements:**

- owner exists

**Effects:**

- returns all recipes owned by the specified user

**Request Body:**

```json
{
  "owner": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "recipe": {
      "_id": "ID",
      "owner": "ID",
      "title": "string",
      "description": "string (optional)",
      "ingredients": [
        {
          "name": "string",
          "quantity": "string",
          "unit": "string (optional)",
          "notes": "string (optional)"
        }
      ],
      "steps": [
        {
          "description": "string",
          "notes": "string (optional)"
        }
      ],
      "tags": ["string"],
      "forkedFrom": "ID (optional)",
      "created": "Date (ISO 8601 string)",
      "updated": "Date (ISO 8601 string)"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/\_searchRecipesByTag

**Description:** Returns all recipes containing the specified tag.

**Requirements:**

- tag is non-empty

**Effects:**

- returns all recipes containing the specified tag

**Request Body:**

```json
{
  "tag": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "recipe": {
      "_id": "ID",
      "owner": "ID",
      "title": "string",
      "description": "string (optional)",
      "ingredients": [
        {
          "name": "string",
          "quantity": "string",
          "unit": "string (optional)",
          "notes": "string (optional)"
        }
      ],
      "steps": [
        {
          "description": "string",
          "notes": "string (optional)"
        }
      ],
      "tags": ["string"],
      "created": "Date (ISO 8601 string)",
      "updated": "Date (ISO 8601 string)"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/\_getForkCount

**Description:** Returns the count of recipes that have been forked from the specified recipe.

**Requirements:**

- recipe exists

**Effects:**

- returns the count of recipes that have been forked from the specified recipe

**Request Body:**

```json
{
  "recipe": "ID"
}
```

**Success Response Body (Query):**

```json
{
  "count": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/\_listForksOfRecipe

**Description:** Returns all recipes that have been forked from the specified recipe.

**Requirements:**

- recipe exists

**Effects:**

- returns all recipes that have been forked from the specified recipe

**Request Body:**

```json
{
  "recipe": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "recipe": {
      "_id": "ID",
      "owner": "ID",
      "title": "string",
      "description": "string (optional)",
      "ingredients": [
        {
          "name": "string",
          "quantity": "string",
          "unit": "string (optional)",
          "notes": "string (optional)"
        }
      ],
      "steps": [
        {
          "description": "string",
          "notes": "string (optional)"
        }
      ],
      "tags": ["string"],
      "forkedFrom": "ID (optional)",
      "created": "Date (ISO 8601 string)",
      "updated": "Date (ISO 8601 string)"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/draftRecipeWithAI

**Description:** Uses AI to suggest modifications to a recipe based on a user's goal. Creates a temporary draft for review.

**Requirements:**

- recipe exists
- goal is non-empty
- GEMINI_API_KEY environment variable is set

**Effects:**

- Calls Gemini AI with the recipe data and goal
- Returns draft data including AI-suggested ingredients, steps, notes, and confidence score
- Draft expires after 24 hours

**Request Body:**

```json
{
  "author": "ID",
  "recipe": "ID",
  "goal": "string"
}
```

**Success Response Body:**

```json
{
  "draftId": "ID",
  "baseRecipe": "ID",
  "requester": "ID",
  "goal": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string (optional)",
      "notes": "string (optional)"
    }
  ],
  "steps": [
    {
      "description": "string",
      "notes": "string (optional)"
    }
  ],
  "notes": "string",
  "confidence": "number (0.0-1.0)",
  "created": "Date (ISO 8601 string)",
  "expires": "Date (ISO 8601 string)"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Recipe/applyDraft

**Description:** Applies an approved AI draft to the original recipe, modifying it directly.

**Requirements:**

- owner must be the recipe owner
- draft details must be well-formed (valid ingredients and steps)

**Effects:**

- Updates the recipe's ingredients and steps with the draft content
- Appends AI modification notes to the recipe description
- Updates the recipe's timestamp

**Request Body:**

```json
{
  "owner": "ID",
  "recipe": "ID",
  "draftDetails": {
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string (optional)",
        "notes": "string (optional)"
      }
    ],
    "steps": [
      {
        "description": "string",
        "notes": "string (optional)"
      }
    ],
    "notes": "string"
  }
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

## Annotation Concept

**Purpose:** capture contextual notes on a specific ingredient or step without altering the recipe.

### POST /api/Annotation/annotate

**Description:** Adds a new unresolved annotation to a recipe, associating text with a specific ingredient or step.

**Requirements:**

- recipe exists
- text ≠ ""
- 0 ≤ index < |target list| for targetKind

**Effects:**

- adds new unresolved annotation
- sets `created`

**Request Body:**

```json
{
  "author": "string (User ID)",
  "recipe": "string (Recipe ID)",
  "targetKind": "string ('Ingredient' | 'Step')",
  "index": "number",
  "text": "string"
}
```

**Success Response Body (Action):**

```json
{
  "annotation": "string (Annotation ID)"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Annotation/editAnnotation

**Description:** Allows the author to modify the text of an existing annotation.

**Requirements:**

- annotation exists
- author = annotation.author

**Effects:**

- annotation.text := newText

**Request Body:**

```json
{
  "author": "string (User ID)",
  "annotation": "string (Annotation ID)",
  "newText": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Annotation/resolveAnnotation

**Description:** Changes the resolution status of an annotation.

**Requirements:**

- annotation exists
- resolver canView annotation.recipe

**Effects:**

- annotation.resolved := resolved

**Request Body:**

```json
{
  "resolver": "string (User ID)",
  "annotation": "string (Annotation ID)",
  "resolved": "boolean"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Annotation/deleteAnnotation

**Description:** Removes an existing annotation, but only if performed by its author.

**Requirements:**

- annotation exists
- author = annotation.author

**Effects:**

- removes annotation

**Request Body:**

```json
{
  "author": "string (User ID)",
  "annotation": "string (Annotation ID)"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Annotation/\_getAnnotationsForRecipe

**Description:** Retrieves all annotations associated with a specific recipe.

**Requirements:**

- recipe exists (implicitly, as it will return an empty array if no annotations are found for the given recipe ID)

**Effects:**

- returns all annotations associated with the given recipe.

**Request Body:**

```json
{
  "recipe": "string (Recipe ID)"
}
```

**Success Response Body (Query):**

```json
[
  {
    "annotation": {
      "_id": "string (Annotation ID)",
      "author": "string (User ID)",
      "recipe": "string (Recipe ID)",
      "targetKind": "string ('Ingredient' | 'Step')",
      "targetIndex": "number",
      "text": "string",
      "created": "string (ISO 8601 DateTime)",
      "resolved": "boolean"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Annotation/\_getAnnotationById

**Description:** Retrieves a specific annotation by its unique ID.

**Requirements:**

- annotation exists (implicitly, will return an empty array if not found)

**Effects:**

- returns the specific annotation by its ID.

**Request Body:**

```json
{
  "annotation": "string (Annotation ID)"
}
```

**Success Response Body (Query):**

```json
[
  {
    "annotation": {
      "_id": "string (Annotation ID)",
      "author": "string (User ID)",
      "recipe": "string (Recipe ID)",
      "targetKind": "string ('Ingredient' | 'Step')",
      "targetIndex": "number",
      "text": "string",
      "created": "string (ISO 8601 DateTime)",
      "resolved": "boolean"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

## Notebook Concept

**Purpose:** organize shared collections of recipes and manage collaborative access.

### POST /api/Notebook/createNotebook

**Description:** Creates a new notebook with a specified owner and title, optionally including a description.

**Requirements:**

- title ≠ ""

**Effects:**

- creates new notebook with owner ∈ members, sets `created`

**Request Body:**

```json
{
  "owner": "ID",
  "title": "string",
  "description": "string"
}
```

**Success Response Body (Action):**

```json
{
  "notebook": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/inviteMember

**Description:** Invites a user to become a member of an existing notebook.

**Requirements:**

- owner = notebook.owner ∧ member exists

**Effects:**

- member ∈ notebook.members

**Request Body:**

```json
{
  "owner": "ID",
  "notebook": "ID",
  "member": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/removeMember

**Description:** Removes a member from a notebook.

**Requirements:**

- owner = notebook.owner ∧ member ∈ notebook.members ∧ member ≠ owner

**Effects:**

- member ∉ notebook.members

**Request Body:**

```json
{
  "owner": "ID",
  "notebook": "ID",
  "member": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/shareRecipe

**Description:** Shares a recipe into a specific notebook.

**Requirements:**

- sharer = recipe.owner ∨ sharer ∈ notebook.members

**Effects:**

- recipe ∈ notebook.recipes (if not already present)

**Request Body:**

```json
{
  "sharer": "ID",
  "recipe": "ID",
  "notebook": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/unshareRecipe

**Description:** Unshares a recipe from a specific notebook.

**Requirements:**

- requester = recipe.owner ∨ requester = notebook.owner

**Effects:**

- recipe ∉ notebook.recipes

**Request Body:**

```json
{
  "requester": "ID",
  "recipe": "ID",
  "notebook": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/deleteNotebook

**Description:** Deletes an existing notebook.

**Requirements:**

- owner = notebook.owner

**Effects:**

- removes notebook and triggers associated unsharing.

**Request Body:**

```json
{
  "owner": "ID",
  "notebook": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/\_getNotebookById

**Description:** Retrieves a specific notebook document by its ID.

**Requirements:**

- notebook exists

**Effects:**

- returns the notebook document

**Request Body:**

```json
{
  "notebook": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "description": "string",
    "members": "ID[]",
    "recipes": "ID[]",
    "created": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/\_getNotebooksByOwner

**Description:** Retrieves all notebooks owned by a specified user.

**Requirements:**

- owner exists

**Effects:**

- returns all notebooks owned by the specified user

**Request Body:**

```json
{
  "owner": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "description": "string",
    "members": "ID[]",
    "recipes": "ID[]",
    "created": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Notebook/\_getNotebooksContainingRecipe

**Description:** Retrieves all notebooks that contain a specific recipe.

**Requirements:**

- recipe ID is valid (implicitly)

**Effects:**

- returns all notebooks containing the specified recipe

**Request Body:**

```json
{
  "recipe": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "description": "string",
    "members": "ID[]",
    "recipes": "ID[]",
    "created": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

## Step Concept

**Purpose:** represent a single instruction in a recipe.

**Note:** The `Step` concept does not expose its own API endpoints. Instead, `Step` objects function as embedded documents or value objects within the state of other concepts, such as `Recipe` and `Version`. The creation, modification, and deletion of `Step` data are managed through the actions and queries of `RecipeConcept` and `VersionConcept`.

---

## Error Handling

All endpoints follow a consistent error handling pattern:

- **HTTP 200**: Success (with JSON response body as documented)
- **HTTP 500**: Internal server error (with `{"error": "An internal server error occurred."}`)

For specific validation errors, the response will include a descriptive error message in the `error` field.

---

## Notes

- All IDs are MongoDB ObjectID strings (ULIDs)
- All timestamps follow ISO 8601 format
- Query endpoints (prefixed with `_`) return arrays of results
- Action endpoints return objects with specific success data or empty objects
- The server runs on port 10000 (configurable via `PORT` env var) with base URL `/api`

---

## 🚀 Frontend Integration Guide

### ⚠️ CRITICAL: Session & User ID Handling

**DO THIS:**

```typescript
// ✅ Correct: Only send session
{
  "session": "your-session-token",
  "recipe": "recipe-id",
  "title": "My Recipe",
  ...
}
```

**DON'T DO THIS:**

```typescript
// ❌ Wrong: Don't send owner/author/requester
{
  "session": "your-session-token",
  "owner": "user-id",  // ❌ Backend ignores this!
  "recipe": "recipe-id",
  ...
}
```

**Why?** The backend automatically gets the user ID from your session token. Sending user IDs from the frontend:

- Is unnecessary (backend handles it)
- Could be a security risk (impersonation attempts)
- Will be ignored anyway (session takes precedence)

---

### Authentication Flow

```typescript
// 1. Register (if new user)
const registerRes = await fetch('/api/User/registerUser', {
  method: 'POST',
  body: JSON.stringify({ name, username, password })
});

// 2. Login (get session token)
const loginRes = await fetch('/api/User/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});
const { user, session } = await loginRes.json();

// 3. Save session (localStorage, cookie, state management, etc.)
localStorage.setItem('session', session);
localStorage.setItem('userId', user);

// 4. Use session in all authenticated requests
const session = localStorage.getItem('session');
const createRes = await fetch('/api/Recipe/createRecipe', {
  method: 'POST',
  body: JSON.stringify({
    session: session,  // ← Include session
    title: 'My Recipe',
    ingredients: [...],
    steps: [...]
  })
});

// 5. Logout (when user logs out)
await fetch('/api/Sessioning/deleteSession', {
  method: 'POST',
  body: JSON.stringify({ session: session })
});
localStorage.removeItem('session');
localStorage.removeItem('userId');
```

---

### Common Request Patterns

#### Creating Resources (Recipes, Notebooks, Annotations):

```typescript
// Pattern: session + resource data
const response = await fetch('/api/Concept/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session: yourSessionToken, // ← Always include for protected endpoints
    // ... resource-specific fields
  }),
})

const result = await response.json()
if (result.error) {
  // Handle error
  if (result.error === 'Invalid session') {
    // Redirect to login
  }
} else {
  // Success! result contains the resource ID
  const resourceId = result.recipe || result.notebook || result.annotation
}
```

#### Querying Data (No session needed):

```typescript
// Pattern: just the query parameters
const response = await fetch('/api/Recipe/_getRecipeById', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipe: recipeId, // No session needed for queries
  }),
})

const result = await response.json()
// result.recipe is an array of recipe objects
```

---

### Endpoint Categories

#### 🔓 Public Endpoints (No session needed):

Use these for browsing, public access, login/registration:

**Authentication:**

- `/api/User/registerUser` - Register new user
- `/api/User/login` - Login (returns session)
- `/api/Sessioning/deleteSession` - Logout

**Queries (read-only):**

- All `/api/Recipe/_get*` and `/api/Recipe/_list*` endpoints
- All `/api/Notebook/_get*` endpoints
- All `/api/Annotation/_get*` endpoints
- All `/api/User/_get*` endpoints

#### 🔒 Protected Endpoints (Session required):

Use these for creating new resources:

- `/api/Recipe/createRecipe` - Create recipe
- `/api/Recipe/draftRecipeWithAI` - Generate AI draft
- `/api/Notebook/createNotebook` - Create notebook
- `/api/Annotation/annotate` - Create annotation
- `/api/Annotation/resolveAnnotation` - Resolve annotation

#### 🔑 Authorized Endpoints (Session + ownership):

Use these for modifying/deleting resources you own:

**Recipes:**

- `/api/Recipe/updateRecipeDetails` - Must own recipe
- `/api/Recipe/deleteRecipe` - Must own recipe
- `/api/Recipe/applyDraft` - Must own recipe

**Notebooks:**

- `/api/Notebook/inviteMember` - Must own notebook
- `/api/Notebook/:notebookId/removeMember` - Must own notebook
- `/api/Notebook/:notebookId/delete` - Must own notebook
- `/api/Notebook/:notebookId/share` - Must own recipe OR be notebook member
- `/api/Notebook/:notebookId/unshare` - Must own recipe OR own notebook

**Annotations:**

- `/api/Annotation/editAnnotation` - Must be annotation author
- `/api/Annotation/deleteAnnotation` - Must be annotation author

---

### Error Handling Best Practices

```typescript
async function apiCall(endpoint, data) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    // Check for errors
    if (result.error) {
      // Handle specific errors
      switch (result.error) {
        case 'Invalid session':
          // Session expired - redirect to login
          redirectToLogin()
          break
        case 'Unauthorized to update this recipe':
          // User doesn't have permission
          showError('You do not have permission to edit this recipe')
          break
        default:
          // Generic error handling
          showError(result.error)
      }
      return null
    }

    // Success!
    return result
  } catch (error) {
    // Network or parsing error
    console.error('API call failed:', error)
    showError('Network error - please try again')
    return null
  }
}
```

---

### AI Recipe Modification Workflow

```typescript
// Step 1: Generate AI draft
const draft = await apiCall('Recipe/draftRecipeWithAI', {
  session: sessionToken,
  recipe: recipeId,
  goal: 'make this vegan',
})

if (draft) {
  // Step 2: Show draft to user for review
  showDraftPreview({
    ingredients: draft.ingredients,
    steps: draft.steps,
    notes: draft.notes,
    confidence: draft.confidence,
  })

  // Step 3: User reviews and decides to apply
  if (userApprovesDraft) {
    const result = await apiCall('Recipe/applyDraft', {
      session: sessionToken,
      recipe: recipeId,
      draftDetails: {
        ingredients: draft.ingredients,
        steps: draft.steps,
        notes: draft.notes,
      },
    })

    if (result) {
      showSuccess('Recipe updated with AI suggestions!')
    }
  }
}
```

---

### Notebook Collaboration Workflow

```typescript
// Step 1: Create notebook
const nb = await apiCall('Notebook/createNotebook', {
  session: sessionToken,
  title: 'Family Cookbook',
})

// Step 2: Invite family members
await apiCall('Notebook/inviteMember', {
  session: sessionToken,
  notebook: nb.notebook,
  member: familyMemberId,
})

// Step 3: Share recipes
await fetch(`/api/Notebook/${nb.notebook}/share`, {
  method: 'POST',
  body: JSON.stringify({
    session: sessionToken,
    recipe: recipeId,
  }),
})

// Step 4: Family members can view shared recipes
const notebooks = await apiCall('Notebook/_getNotebooksWithMember', {
  member: familyMemberId, // No session needed for queries
})
```

---

## 🔧 Development & Testing

### Testing with cURL:

```bash
# Register
curl -X POST http://localhost:10000/api/User/registerUser \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","username":"alice","password":"pass123"}'

# Login (save the session token)
curl -X POST http://localhost:10000/api/User/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass123"}'

# Create Recipe (use session from login)
curl -X POST http://localhost:10000/api/Recipe/createRecipe \
  -H "Content-Type: application/json" \
  -d '{"session":"YOUR_SESSION_TOKEN","title":"Test","ingredients":[{"name":"flour","quantity":"1","unit":"cup"}],"steps":[{"description":"Mix"}]}'
```

### Backend Requirements:

**Environment Variables:**

- `GEMINI_API_KEY` - Required for AI features (get from Google AI Studio)
- `PORT` - Optional, defaults to 10000
- `MONGODB_URI` - MongoDB connection string

**Start Backend:**

```bash
cd nibble-backend
deno run start
```

**Backend will log:**

```
🚀 Server running on http://localhost:10000
✅ Connected to MongoDB
✅ All syncs registered
```

---

## ✅ Frontend Checklist

Before integrating, make sure you:

- [ ] Understand session-based authentication
- [ ] Save session token after login
- [ ] Include session in all protected endpoints
- [ ] **Never send `author`/`owner`/`requester` fields**
- [ ] Handle "Invalid session" errors by redirecting to login
- [ ] Use public query endpoints for browsing (no session)
- [ ] Test AI draft workflow (generate → review → apply)
- [ ] Test notebook sharing workflow
- [ ] Handle all error cases gracefully
- [ ] Set `GEMINI_API_KEY` in backend .env for AI features

---

## 📞 Support & Documentation

**Backend Implementation Details:**

- See `SYNC_IMPLEMENTATION_MASTER_SUMMARY.md` for complete architecture
- See `PASSTHROUGH_FIXES_COMPLETE.md` for security details
- See `src/syncs/` for sync implementations

**Quick Reference:**

- **28 total endpoints** (7 Recipe + 10 Notebook + 6 Annotation + 4 User + 1 Session)
- **All actions use POST** with JSON bodies
- **Sessions expire** after 7 days
- **AI features** require `GEMINI_API_KEY`

---

**Last Updated:** November 5, 2025  
**Backend Status:** ✅ Production Ready  
**All Sync Requirements:** ✅ Met  
**Security:** ✅ Fully Implemented
