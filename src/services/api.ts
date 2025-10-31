import type {
	ActionResponse,
	Annotation,
	AnnotationCreate,
	AnnotationResolve,
	AnnotationUpdate,
	ID,
	Notebook,
	NotebookCreate,
	NotebookInvite,
	NotebookShare,
	Recipe,
	RecipeCreate,
	RecipeUpdate,
	User,
	UserLogin,
	UserRegistration,
	UserUpdate,
	Version,
	VersionCreate,
	VersionDraft,
	VersionDraftCreate,
} from "@/types/api";
import { userStorage } from "@/utils/secureStorage";

const API_BASE_URL = "/api";

class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

// Retry configuration
interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 10000,
	backoffMultiplier: 2,
};

// Utility function to check if error is retryable
function isRetryableError(error: ApiError): boolean {
	if (!error.status) return true; // Network errors are retryable
	return error.status >= 500 || error.status === 429; // Server errors and rate limiting
}

// Utility function to calculate delay with exponential backoff
function calculateDelay(attempt: number, config: RetryConfig): number {
	const delay = config.baseDelay * config.backoffMultiplier ** (attempt - 1);
	return Math.min(delay, config.maxDelay);
}

// Utility function to sleep
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest<T>(
	endpoint: string,
	data: unknown,
	method: "POST" = "POST",
	retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
	let lastError: ApiError = new ApiError("Unknown error");

	for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
		try {
			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				method,
				headers: {
					"Content-Type": "application/json",
					// Add authorization header if user is logged in
					...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
				},
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok || result.error) {
				const error = new ApiError(
					result.error || `Request failed with status ${response.status}`,
					response.status,
					result.code,
					result.details,
				);

				// If it's not retryable or this is the last attempt, throw immediately
				if (!isRetryableError(error) || attempt === retryConfig.maxRetries) {
					throw error;
				}

				lastError = error;
				await sleep(calculateDelay(attempt, retryConfig));
				continue;
			}

			return result;
		} catch (error) {
			if (error instanceof ApiError) {
				// If it's not retryable or this is the last attempt, throw immediately
				if (!isRetryableError(error) || attempt === retryConfig.maxRetries) {
					throw error;
				}

				lastError = error;
				await sleep(calculateDelay(attempt, retryConfig));
				continue;
			}

			// Network error - retryable
			const networkError = new ApiError("Network error occurred");
			if (attempt === retryConfig.maxRetries) {
				throw networkError;
			}

			lastError = networkError;
			await sleep(calculateDelay(attempt, retryConfig));
		}
	}

	throw lastError;
}

// Simple auth token management (will be enhanced later)
function getAuthToken(): string | null {
	return userStorage.getAuthToken();
}

// Response parsing utilities to handle inconsistent backend responses
function parseQueryResponse<T>(response: unknown, key: string): T[] {
	if (Array.isArray(response)) {
		// Direct array response
		return response.map((item) => {
			if (typeof item === "object" && item !== null && key in item) {
				return (item as Record<string, unknown>)[key] as T;
			}
			return item as T;
		});
	}

	if (typeof response === "object" && response !== null && key in response) {
		const value = (response as Record<string, unknown>)[key];
		if (Array.isArray(value)) {
			return value as T[];
		}
		return [value as T];
	}

	return [];
}

function parseSingleResponse<T>(response: unknown, key: string): T | null {
	console.log("🔍 parseSingleResponse - input:", response, "key:", key);

	if (Array.isArray(response)) {
		if (response.length === 0) return null;
		const item = response[0];
		console.log("🔍 parseSingleResponse - first item:", item);

		if (typeof item === "object" && item !== null && key in item) {
			const result = (item as Record<string, unknown>)[key] as T;
			console.log("🔍 parseSingleResponse - extracted from key:", result);
			return result;
		}
		console.log("🔍 parseSingleResponse - returning item as-is:", item);
		return item as T;
	}

	if (typeof response === "object" && response !== null && key in response) {
		const extracted = (response as Record<string, unknown>)[key];
		console.log(
			"🔍 parseSingleResponse - extracted from object key:",
			extracted,
		);

		// If the extracted value is an array, return the first item
		if (Array.isArray(extracted)) {
			if (extracted.length === 0) return null;
			const result = extracted[0] as T;
			console.log(
				"🔍 parseSingleResponse - returning first item from array:",
				result,
			);
			return result;
		}

		console.log(
			"🔍 parseSingleResponse - returning extracted value:",
			extracted,
		);
		return extracted as T;
	}

	console.log("🔍 parseSingleResponse - returning response as-is:", response);
	return response as T;
}

// User API
export const userApi = {
	async register(data: UserRegistration): Promise<ActionResponse> {
		return apiRequest("/User/registerUser", data);
	},

	async login(data: UserLogin): Promise<ActionResponse> {
		return apiRequest("/User/login", data);
	},

	async updateProfile(data: UserUpdate): Promise<ActionResponse> {
		return apiRequest("/User/updateProfile", data);
	},

	async getUserDetails(userId: ID): Promise<User> {
		const response = await apiRequest("/User/_getUserDetails", {
			user: userId,
		});
		const user = parseSingleResponse<User>(response, "user") || {
			_id: userId,
			name: "",
			username: "",
			preferences: {},
		};

		// CRITICAL: Backend doesn't return _id, so we must inject it
		if (!user._id) {
			user._id = userId;
		}

		return user;
	},
	async getUserIDByUsername(username: string): Promise<ID> {
		const response = await apiRequest("/User/_getUserIDByUsername", {
			username,
		});
		const userId = parseSingleResponse<ID>(response, "user");
		return userId || "";
	},
};

// Recipe API
export const recipeApi = {
	async createRecipe(data: RecipeCreate): Promise<ActionResponse> {
		return apiRequest("/Recipe/createRecipe", data);
	},

	async addTag(recipeId: ID, tag: string): Promise<ActionResponse> {
		return apiRequest("/Recipe/addTag", { recipe: recipeId, tag });
	},

	async removeTag(recipeId: ID, tag: string): Promise<ActionResponse> {
		return apiRequest("/Recipe/removeTag", { recipe: recipeId, tag });
	},

	async deleteRecipe(requesterId: ID, recipeId: ID): Promise<ActionResponse> {
		return apiRequest("/Recipe/deleteRecipe", {
			requester: requesterId,
			recipe: recipeId,
		});
	},

	async updateRecipeDetails(data: RecipeUpdate): Promise<ActionResponse> {
		return apiRequest("/Recipe/updateRecipeDetails", data);
	},

	async getRecipeById(recipeId: ID): Promise<Recipe> {
		const response = await apiRequest("/Recipe/_getRecipeById", {
			recipe: recipeId,
		});

		console.log("🔍 getRecipeById - raw response:", response);
		console.log("🔍 getRecipeById - response type:", typeof response);
		console.log("🔍 getRecipeById - is array:", Array.isArray(response));

		const parsed = parseSingleResponse<Recipe>(response, "recipe");
		console.log("🔍 getRecipeById - parsed result:", parsed);

		return (
			parsed || {
				_id: recipeId,
				owner: "",
				title: "",
				ingredients: [],
				steps: [],
				tags: [],
				created: "",
				updated: "",
			}
		);
	},

	async listRecipesByOwner(ownerId: ID): Promise<Recipe[]> {
		const response = await apiRequest("/Recipe/_listRecipesByOwner", {
			owner: ownerId,
		});
		return parseQueryResponse<Recipe>(response, "recipe");
	},

	async searchRecipesByTag(tag: string): Promise<Recipe[]> {
		const response = await apiRequest("/Recipe/_searchRecipesByTag", { tag });
		return parseQueryResponse<Recipe>(response, "recipe");
	},

	async getRecipesByIds(recipeIds: ID[]): Promise<Recipe[]> {
		if (recipeIds.length === 0) return [];

		// For now, we'll fetch each recipe individually
		// In a real app, you'd want a batch endpoint
		const recipes = await Promise.all(
			recipeIds.map((id) => this.getRecipeById(id)),
		);

		return recipes.filter((recipe) => recipe !== null) as Recipe[];
	},

	async draftRecipeWithAI(
		author: string,
		recipe: string,
		goal: string,
	): Promise<ActionResponse> {
		return apiRequest("/Recipe/draftRecipeWithAI", {
			author,
			recipe,
			goal,
		});
	},

	async applyDraft(
		owner: string,
		recipe: string,
		draftDetails: {
			ingredients: Array<{
				name: string;
				quantity: string;
				unit?: string;
				notes?: string;
			}>;
			steps: Array<{
				description: string;
				notes?: string;
			}>;
			notes: string;
		},
	): Promise<ActionResponse> {
		return apiRequest("/Recipe/applyDraft", {
			owner,
			recipe,
			draftDetails,
		});
	},

	async getForkCount(recipeId: ID): Promise<ActionResponse> {
		return apiRequest("/Recipe/_getForkCount", { recipe: recipeId });
	},
};

// Version API
export const versionApi = {
	async createVersion(data: VersionCreate): Promise<ActionResponse> {
		return apiRequest("/Version/createVersion", data);
	},

	async deleteVersion(
		requesterId: string,
		versionId: string,
	): Promise<ActionResponse> {
		return apiRequest("/Version/deleteVersion", {
			requester: requesterId,
			version: versionId,
		});
	},

	async draftVersionWithAI(
		author: string,
		recipe: string,
		goal: string,
		options: Record<string, unknown> = {},
	): Promise<ActionResponse> {
		return apiRequest("/Version/draftVersionWithAI", {
			author,
			recipe,
			goal,
			options,
		});
	},

	async approveDraft(data: Record<string, unknown>): Promise<ActionResponse> {
		return apiRequest("/Version/approveDraft", data);
	},

	async rejectDraft(
		author: string,
		draftId: string,
		baseRecipe: string,
		goal: string,
	): Promise<ActionResponse> {
		return apiRequest("/Version/rejectDraft", {
			author,
			draftId,
			baseRecipe,
			goal,
		});
	},

	async getVersionById(versionId: string): Promise<Version> {
		const response = await apiRequest("/Version/_getVersionById", {
			version: versionId,
		});
		return (
			parseSingleResponse<Version>(response, "version") || {
				id: versionId,
				baseRecipe: "",
				versionNum: "",
				author: "",
				notes: "",
				ingredients: [],
				steps: [],
				created: "",
				promptHistory: [],
			}
		);
	},

	async listVersionsByRecipe(recipeId: string): Promise<Version[]> {
		const response = await apiRequest("/Version/_listVersionsByRecipe", {
			recipe: recipeId,
		});
		return parseQueryResponse<Version>(response, "version");
	},

	async listVersionsByAuthor(authorId: string): Promise<Version[]> {
		const response = await apiRequest("/Version/_listVersionsByAuthor", {
			author: authorId,
		});
		return parseQueryResponse<Version>(response, "version");
	},
};

// VersionDraft API
export const versionDraftApi = {
	async createDraft(data: VersionDraftCreate): Promise<ActionResponse> {
		return apiRequest("/VersionDraft/createDraft", data);
	},

	async deleteDraft(draftId: string): Promise<ActionResponse> {
		return apiRequest("/VersionDraft/deleteDraft", { id: draftId });
	},

	async getDraftById(draftId: string): Promise<VersionDraft> {
		const response = await apiRequest("/VersionDraft/_getDraftById", {
			id: draftId,
		});
		return (
			parseSingleResponse<VersionDraft>(response, "draft") || {
				_id: draftId,
				requester: "",
				baseRecipe: "",
				goal: "",
				ingredients: [],
				steps: [],
				notes: "",
				confidence: 0,
				created: "",
				expires: "",
			}
		);
	},

	async listDraftsByRequester(requesterId: string): Promise<VersionDraft[]> {
		const response = await apiRequest("/VersionDraft/_listDraftsByRequester", {
			requester: requesterId,
		});
		return parseQueryResponse<VersionDraft>(response, "draft");
	},

	async cleanupExpiredDrafts(): Promise<ActionResponse> {
		return apiRequest("/VersionDraft/_cleanupExpiredDrafts", {});
	},
};

// Annotation API
export const annotationApi = {
	async annotate(data: AnnotationCreate): Promise<ActionResponse> {
		return apiRequest("/Annotation/annotate", data);
	},

	async editAnnotation(data: AnnotationUpdate): Promise<ActionResponse> {
		return apiRequest("/Annotation/editAnnotation", data);
	},

	async resolveAnnotation(data: AnnotationResolve): Promise<ActionResponse> {
		return apiRequest("/Annotation/resolveAnnotation", data);
	},

	async deleteAnnotation(
		authorId: string,
		annotationId: string,
	): Promise<ActionResponse> {
		return apiRequest("/Annotation/deleteAnnotation", {
			author: authorId,
			annotation: annotationId,
		});
	},

	async getAnnotationsForRecipe(recipeId: string): Promise<Annotation[]> {
		const response = await apiRequest("/Annotation/_getAnnotationsForRecipe", {
			recipe: recipeId,
		});
		return parseQueryResponse<Annotation>(response, "annotation");
	},

	async getAnnotationById(annotationId: string): Promise<Annotation> {
		const response = await apiRequest("/Annotation/_getAnnotationById", {
			annotation: annotationId,
		});
		return (
			parseSingleResponse<Annotation>(response, "annotation") || {
				_id: annotationId,
				author: "",
				recipe: "",
				targetKind: "Ingredient",
				targetIndex: 0,
				text: "",
				created: "",
				resolved: false,
			}
		);
	},
};

// Notebook API
export const notebookApi = {
	async createNotebook(data: NotebookCreate): Promise<ActionResponse> {
		return apiRequest("/Notebook/createNotebook", data);
	},

	async inviteMember(data: NotebookInvite): Promise<ActionResponse> {
		return apiRequest("/Notebook/inviteMember", data);
	},

	async removeMember(
		ownerId: ID,
		notebookId: ID,
		memberId: ID,
	): Promise<ActionResponse> {
		return apiRequest("/Notebook/removeMember", {
			owner: ownerId,
			notebook: notebookId,
			member: memberId,
		});
	},

	async shareRecipe(data: NotebookShare): Promise<ActionResponse> {
		return apiRequest("/Notebook/shareRecipe", data);
	},

	async unshareRecipe(
		requesterId: ID,
		recipeId: ID,
		notebookId: ID,
	): Promise<ActionResponse> {
		return apiRequest("/Notebook/unshareRecipe", {
			requester: requesterId,
			recipe: recipeId,
			notebook: notebookId,
		});
	},

	async deleteNotebook(ownerId: ID, notebookId: ID): Promise<ActionResponse> {
		return apiRequest("/Notebook/deleteNotebook", {
			owner: ownerId,
			notebook: notebookId,
		});
	},

	async getNotebookById(notebookId: ID): Promise<Notebook> {
		const response = await apiRequest("/Notebook/_getNotebookById", {
			notebook: notebookId,
		});
		return (
			parseSingleResponse<Notebook>(response, "notebook") || {
				_id: notebookId,
				owner: "",
				title: "",
				description: "",
				members: [],
				recipes: [],
				created: "",
			}
		);
	},

	async getNotebooksByOwner(ownerId: ID): Promise<Notebook[]> {
		const response = await apiRequest("/Notebook/_getNotebooksByOwner", {
			owner: ownerId,
		});
		return parseQueryResponse<Notebook>(response, "notebook");
	},

	async getNotebooksContainingRecipe(recipeId: ID): Promise<Notebook[]> {
		const response = await apiRequest(
			"/Notebook/_getNotebooksContainingRecipe",
			{
				recipe: recipeId,
			},
		);
		return parseQueryResponse<Notebook>(response, "notebook");
	},

	async getNotebooksByMember(memberId: ID): Promise<Notebook[]> {
		const response = await apiRequest("/Notebook/_getNotebooksWithMember", {
			member: memberId,
		});
		return parseQueryResponse<Notebook>(response, "notebook");
	},
};

export { ApiError };
