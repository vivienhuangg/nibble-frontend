# Nibble Backend API Specification

**Base URL:** `http://localhost:8000/api`

**Protocol:** All endpoints accept POST requests with JSON request bodies and return JSON responses.

---

## Table of Contents

1. [User Concept](#user-concept)
2. [Recipe Concept](#recipe-concept)
3. [Version Concept](#version-concept)
4. [VersionDraft Concept](#versiondraft-concept)
5. [Annotation Concept](#annotation-concept)
6. [Notebook Concept](#notebook-concept)
7. [Step Concept](#step-concept)

---

## User Concept

**Purpose:** represent an individual user within the system, enabling personalization, ownership, and access control.

### POST /api/User/registerUser

**Description:** Creates a new user in the system.

**Requirements:**
- no user with the given `email` already exists.
- `name` and `password` are non-empty strings.

**Effects:**
- creates a new user, stores `name`, `email`, and `passwordHash` (plain password for this exercise);
- initializes `preferences` to an empty map;
- returns the `ID` of the newly created user.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
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

**Description:** Authenticates a user with the provided email and password.

**Requirements:**
- a user with the given `email` and `password` exists.

**Effects:**
- returns the `ID` of the authenticated user.

**Request Body:**
```json
{
  "email": "string",
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

### POST /api/User/updateProfile

**Description:** Updates the profile information for a specified user.

**Requirements:**
- the `user` identified by `user: ID` must exist.
- If `newEmail` is provided, it must be unique among other users.

**Effects:**
- updates the `name`, `email`, and/or `preferences` for the specified user.
- Returns an empty object on success.

**Request Body:**
```json
{
  "user": "ID",
  "newName": "string",
  "newEmail": "string",
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

### POST /api/User/_getUserDetails

**Description:** Returns the details (name, email, preferences) of the specified user.

**Requirements:**
- a user with the given `user: ID` exists.

**Effects:**
- returns the details (name, email, preferences) of the specified user.

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
      "email": "string",
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

### POST /api/User/_getUserIDByEmail

**Description:** Returns the ID of the user with the specified email.

**Requirements:**
- a user with the given `email` exists.

**Effects:**
- returns the ID of the user with the specified email.

**Request Body:**
```json
{
  "email": "string"
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

## Recipe Concept

**Purpose:** represent a canonical recipe owned by a user, with its core ingredients, steps, and descriptive metadata.

### POST /api/Recipe/createRecipe

**Description:** Adds a new recipe with an empty tag set, sets creation and update times, and returns the new recipe's ID.

**Requirements:**
- owner exists; title ≠ ""; ingredients and steps well-formed

**Effects:**
- adds new recipe with empty tag set, sets creation/update times; returns the new recipe's ID

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
      "duration": "number (optional)",
      "notes": "string (optional)"
    }
  ],
  "description": "string (optional)"
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
      "duration": "number (optional)",
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

### POST /api/Recipe/_getRecipeById

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
          "duration": "number (optional)",
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

### POST /api/Recipe/_listRecipesByOwner

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
          "duration": "number (optional)",
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

### POST /api/Recipe/_searchRecipesByTag

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
          "duration": "number (optional)",
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

## Version Concept

**Purpose:** capture concrete modifications to a recipe as immutable snapshots — with optional AI assistance that can propose draft versions from natural-language goals.

### POST /api/Version/createVersion

**Description:** Creates a new immutable version of a recipe.

**Requirements:**
- recipe exists
- versionNum unique for recipe (e.g., "1.0", "1.1", "2.0")
- ingredients/steps must be well-formed.

**Effects:**
- adds new version linked to recipe, sets `created`
- returns the ID of the new version.

**Request Body:**
```json
{
  "author": "string",
  "recipe": "string",
  "versionNum": "string",
  "notes": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string",
      "notes": "string"
    }
  ],
  "steps": [
    {
      "description": "string",
      "duration": "number",
      "notes": "string"
    }
  ],
  "promptHistory": [
    {
      "promptText": "string",
      "modelName": "string",
      "timestamp": "string (ISO 8601)",
      "draftId": "string",
      "status": "Approved | Rejected | Generated | Failed"
    }
  ]
}
```

**Success Response Body (Action):**
```json
{
  "version": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Version/deleteVersion

**Description:** Deletes a specific recipe version.

**Requirements:**
- requester = version.author OR requester = recipe.owner (the latter check is typically handled by sync with Recipe concept).

**Effects:**
- removes version.

**Request Body:**
```json
{
  "requester": "string",
  "version": "string"
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

### POST /api/Version/draftVersionWithAI

**Description:** Initiates an AI-driven process to suggest modifications to a recipe, outputting data to create a transient draft.

**Requirements:**
- recipe exists
- goal ≠ ""
- (LLM service available externally).

**Effects:**
- Simulates an LLM call to get proposed changes
- outputs all data necessary for a sync to create a `VersionDraft`.
- Does not directly modify `Version` concept state, as `promptHistory` is populated when a draft is approved into a concrete version.

**Request Body:**
```json
{
  "author": "string",
  "recipe": "string",
  "goal": "string",
  "options": {}
}
```

**Success Response Body (Action):**
```json
{
  "draftId": "string",
  "baseRecipe": "string",
  "requester": "string",
  "goal": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string",
      "notes": "string"
    }
  ],
  "steps": [
    {
      "description": "string",
      "duration": "number",
      "notes": "string"
    }
  ],
  "notes": "string",
  "confidence": "number",
  "created": "string (ISO 8601)",
  "expires": "string (ISO 8601)"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Version/approveDraft

**Description:** Approves a specific AI-generated draft, initiating its promotion to an official immutable version and the deletion of the transient draft.

**Requirements:**
- draft exists (implicitly, as `draftId` and `draftDetails` are passed)
- author is the requester of the draft (implicitly handled by sync/client)
- newVersionNum unique for recipe.

**Effects:**
- Outputs data to trigger: 1) creation of a new `Version` (including the approved `promptHistoryEntry`), and 2) deletion of the `VersionDraft`.
- This action does not directly modify `Version` concept state, but prepares the data for a new `Version` record to be created via sync.

**Request Body:**
```json
{
  "author": "string",
  "draftId": "string",
  "baseRecipe": "string",
  "newVersionNum": "string",
  "draftDetails": {
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "notes": "string"
      }
    ],
    "steps": [
      {
        "description": "string",
        "duration": "number",
        "notes": "string"
      }
    ],
    "notes": "string",
    "goal": "string",
    "confidence": "number"
  }
}
```

**Success Response Body (Action):**
```json
{
  "newVersionId": "string",
  "author": "string",
  "recipe": "string",
  "versionNum": "string",
  "notes": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string",
      "notes": "string"
    }
  ],
  "steps": [
    {
      "description": "string",
      "duration": "number",
      "notes": "string"
    }
  ],
  "draftToDeleteId": "string",
  "promptHistoryEntry": {
    "promptText": "string",
    "modelName": "string",
    "timestamp": "string (ISO 8601)",
    "draftId": "string",
    "status": "Approved | Rejected | Generated | Failed"
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Version/rejectDraft

**Description:** Rejects a specific AI-generated draft, initiating its removal from transient drafts.

**Requirements:**
- draft exists (implicitly via `draftId`)
- author is the requester of the draft (implicitly handled by sync/client).

**Effects:**
- Outputs data to trigger deletion of the `VersionDraft`.
- Also outputs a `promptHistoryEntry` with "Rejected" status.
- This `promptHistoryEntry` is not stored within the `Version` concept itself by this action, as no `VersionDoc` is created from a rejected draft.

**Request Body:**
```json
{
  "author": "string",
  "draftId": "string",
  "baseRecipe": "string",
  "goal": "string"
}
```

**Success Response Body (Action):**
```json
{
  "draftToDeleteId": "string",
  "promptHistoryEntry": {
    "promptText": "string",
    "modelName": "string",
    "timestamp": "string (ISO 8601)",
    "draftId": "string",
    "status": "Approved | Rejected | Generated | Failed"
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Version/_getVersionById

**Description:** Retrieves a specific recipe version by its ID.

**Requirements:**
- The version ID exists.

**Effects:**
- Returns an array containing the Version document if found, otherwise an empty array or an error.

**Request Body:**
```json
{
  "version": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "id": "string",
    "baseRecipe": "string",
    "versionNum": "string",
    "author": "string",
    "notes": "string",
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "notes": "string"
      }
    ],
    "steps": [
      {
        "description": "string",
        "duration": "number",
        "notes": "string"
      }
    ],
    "created": "string (ISO 8601)",
    "promptHistory": [
      {
        "promptText": "string",
        "modelName": "string",
        "timestamp": "string (ISO 8601)",
        "draftId": "string",
        "status": "Approved | Rejected | Generated | Failed"
      }
    ]
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

### POST /api/Version/_listVersionsByRecipe

**Description:** Lists all versions associated with a specific base recipe.

**Requirements:**
- The recipe ID exists.

**Effects:**
- Returns an array of Version documents for the given recipe, ordered by creation time.

**Request Body:**
```json
{
  "recipe": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "id": "string",
    "baseRecipe": "string",
    "versionNum": "string",
    "author": "string",
    "notes": "string",
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "notes": "string"
      }
    ],
    "steps": [
      {
        "description": "string",
        "duration": "number",
        "notes": "string"
      }
    ],
    "created": "string (ISO 8601)",
    "promptHistory": [
      {
        "promptText": "string",
        "modelName": "string",
        "timestamp": "string (ISO 8601)",
        "draftId": "string",
        "status": "Approved | Rejected | Generated | Failed"
      }
    ]
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

### POST /api/Version/_listVersionsByAuthor

**Description:** Lists all versions authored by a specific user.

**Requirements:**
- The author ID exists.

**Effects:**
- Returns an array of Version documents authored by the given user.

**Request Body:**
```json
{
  "author": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "id": "string",
    "baseRecipe": "string",
    "versionNum": "string",
    "author": "string",
    "notes": "string",
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "notes": "string"
      }
    ],
    "steps": [
      {
        "description": "string",
        "duration": "number",
        "notes": "string"
      }
    ],
    "created": "string (ISO 8601)",
    "promptHistory": [
      {
        "promptText": "string",
        "modelName": "string",
        "timestamp": "string (ISO 8601)",
        "draftId": "string",
        "status": "Approved | Rejected | Generated | Failed"
      }
    ]
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

## VersionDraft Concept

**Purpose:** represent a temporary, AI-generated suggestion for a recipe modification, awaiting user review.

### POST /api/VersionDraft/createDraft

**Description:** Creates a new transient AI-generated version draft.

**Requirements:**
- baseRecipe exists
- goal is not empty
- ingredients and steps are well-formed.

**Effects:**
- A new VersionDraft document is created with a fresh ID, associated with the requester, baseRecipe, and AI-generated content.
- `created` and `expires` timestamps are set.
- Returns the ID of the new draft.

**Request Body:**
```json
{
  "requester": "string",
  "baseRecipe": "string",
  "goal": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string",
      "unit": "string",
      "notes": "string"
    }
  ],
  "steps": [
    {
      "description": "string",
      "duration": 0,
      "notes": "string"
    }
  ],
  "notes": "string",
  "confidence": 0.0
}
```

**Success Response Body (Action):**
```json
{
  "id": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/VersionDraft/deleteDraft

**Description:** Removes a transient AI-generated version draft.

**Requirements:**
- A VersionDraft with the given `id` exists.

**Effects:**
- The VersionDraft document with the specified `id` is removed from the system.

**Request Body:**
```json
{
  "id": "string"
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

### POST /api/VersionDraft/_getDraftById

**Description:** Retrieves a specific version draft by its ID.

**Requirements:**
- A VersionDraft with the given `id` exists.

**Effects:**
- Returns an array containing the VersionDraft document if found, otherwise an empty array or an error.

**Request Body:**
```json
{
  "id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "requester": "string",
    "baseRecipe": "string",
    "goal": "string",
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "notes": "string"
      }
    ],
    "steps": [
      {
        "description": "string",
        "duration": 0,
        "notes": "string"
      }
    ],
    "notes": "string",
    "confidence": 0.0,
    "created": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "expires": "YYYY-MM-DDTHH:MM:SS.sssZ"
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

### POST /api/VersionDraft/_listDraftsByRequester

**Description:** Lists all version drafts requested by a specific user.

**Requirements:**
- The requester ID is valid.

**Effects:**
- Returns an array of VersionDraft documents associated with the requester, or an empty array.

**Request Body:**
```json
{
  "requester": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "requester": "string",
    "baseRecipe": "string",
    "goal": "string",
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "notes": "string"
      }
    ],
    "steps": [
      {
        "description": "string",
        "duration": 0,
        "notes": "string"
      }
    ],
    "notes": "string",
    "confidence": 0.0,
    "created": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "expires": "YYYY-MM-DDTHH:MM:SS.sssZ"
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

### POST /api/VersionDraft/_cleanupExpiredDrafts

**Description:** Automatically removes version drafts that have passed their expiry time. (System Action)

**Requirements:**
- The current time is after a draft's `expires` timestamp.

**Effects:**
- All expired VersionDraft documents are removed from the system.

**Request Body:**
```json
{}
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

### POST /api/Annotation/_getAnnotationsForRecipe

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

### POST /api/Annotation/_getAnnotationById

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

### POST /api/Notebook/_getNotebookById

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

### POST /api/Notebook/_getNotebooksByOwner

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

- All IDs are MongoDB ObjectID strings
- All timestamps follow ISO 8601 format
- Query endpoints (prefixed with `_`) return arrays of results
- Action endpoints return objects with specific success data or empty objects
- The server is configured to run on port 8000 with base URL `/api`

