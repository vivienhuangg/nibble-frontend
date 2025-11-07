// API Types for Nibble Backend
export type ID = string;

// User Types
export interface User {
	_id: ID;
	name: string;
	username: string;
	preferences: Record<string, unknown>;
}

export interface UserRegistration {
	name: string;
	username: string;
	password: string;
}

export interface UserLogin {
	username: string;
	password: string;
}

export interface UserUpdate {
	user: ID;
	newName?: string;
	newUsername?: string;
	newPreferences?: Record<string, unknown>;
}

// Recipe Types
export interface Ingredient {
	name: string;
	quantity: string;
	unit?: string;
	notes?: string;
}

export interface Step {
	description: string;
	duration?: number;
	notes?: string;
}

export interface Recipe {
	_id: ID;
	owner: ID;
	title: string;
	description?: string;
	ingredients: Ingredient[];
	steps: Step[];
	tags: string[];
	forkedFrom?: ID;
	created: string; // ISO 8601
	updated: string; // ISO 8601
}

export interface RecipeCreate {
	owner: ID;
	title: string;
	ingredients: Ingredient[];
	steps: Step[];
	description?: string;
	forkedFrom?: ID;
}

export interface RecipeUpdate {
	owner: ID;
	recipe: ID;
	newTitle?: string;
	newDescription?: string;
	newIngredients?: Ingredient[];
	newSteps?: Step[];
}

// Version Types
export interface PromptHistoryEntry {
	promptText: string;
	modelName: string;
	timestamp: string; // ISO 8601
	draftId: string;
	status: "Approved" | "Rejected" | "Generated" | "Failed";
}

export interface Version {
	id: ID;
	baseRecipe: ID;
	versionNum: string;
	author: string;
	notes: string;
	ingredients: Ingredient[];
	steps: Step[];
	created: string; // ISO 8601
	promptHistory: PromptHistoryEntry[];
}

export interface VersionCreate {
	author: string;
	recipe: string;
	versionNum: string;
	notes: string;
	ingredients: Ingredient[];
	steps: Step[];
	promptHistory: PromptHistoryEntry[];
}

// VersionDraft Types
export interface VersionDraft {
	_id: ID;
	requester: ID;
	baseRecipe: ID;
	goal: string;
	title?: string; // AI-suggested title
	ingredients: Ingredient[];
	steps: Step[];
	notes: string;
	confidence: number;
	created: string; // ISO 8601
	expires: string; // ISO 8601
}

export interface VersionDraftCreate {
	requester: string;
	baseRecipe: string;
	goal: string;
	title?: string; // AI-suggested title
	ingredients: Ingredient[];
	steps: Step[];
	notes: string;
	confidence: number;
}

// Annotation Types
export interface Annotation {
	_id: ID;
	author: ID;
	recipe: ID;
	targetKind: "Ingredient" | "Step";
	targetIndex: number;
	text: string;
	created: string; // ISO 8601
	resolved: boolean;
}

export interface AnnotationCreate {
	author: string;
	recipe: string;
	targetKind: "Ingredient" | "Step";
	index: number;
	text: string;
}

export interface AnnotationUpdate {
	author: string;
	annotation: string;
	newText: string;
}

export interface AnnotationResolve {
	resolver: string;
	annotation: string;
	resolved: boolean;
}

// Notebook Types
export interface Notebook {
	_id: ID;
	owner: ID;
	title: string;
	description: string;
	members: ID[];
	recipes: ID[];
	created: string; // ISO 8601
}

export interface NotebookCreate {
	owner: ID;
	title: string;
	description: string;
}

export interface NotebookInvite {
	owner: ID;
	notebook: ID;
	member: ID;
}

export interface NotebookShare {
	sharer: ID;
	recipe: ID;
	notebook: ID;
}

// API Response Types
export interface ApiResponse<T = unknown> {
	data?: T;
	error?: string;
}

export interface ActionResponse {
	[key: string]: unknown;
}

export interface QueryResponse<T = unknown> {
	[key: string]: T;
}
