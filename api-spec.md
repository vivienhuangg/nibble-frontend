# Nibble Backend API Specification

**Base URL:** `http://localhost:8000/api`

**Protocol:** All endpoints accept POST requests with JSON request bodies and return JSON responses.

---

## Table of Contents

1. [User Concept](#user-concept)
2. [Recipe Concept](#recipe-concept)
3. [Annotation Concept](#annotation-concept)
4. [Notebook Concept](#notebook-concept)
5. [Step Concept](#step-concept)

---

## User Concept

**Purpose:** represent an individual user within the system, enabling personalization, ownership, and access control.

### POST /api/User/registerUser

**Description:** Creates a new user in the system.

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

**Description:** Authenticates a user with the provided username and password.

**Requirements:**

- a user with the given `username` and `password` exists.

**Effects:**

- returns the `ID` of the authenticated user.

**Request Body:**

```json
{
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

- All IDs are MongoDB ObjectID strings
- All timestamps follow ISO 8601 format
- Query endpoints (prefixed with `_`) return arrays of results
- Action endpoints return objects with specific success data or empty objects
- The server is configured to run on port 8000 with base URL `/api`
