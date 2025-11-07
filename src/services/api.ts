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
			// Automatically inject session token into request body if available
			const sessionToken = getSessionToken();
			const shouldStripDerivedFields = !endpoint.includes("/_");

			// CRITICAL: Remove owner/author/requester fields - backend derives from session
			let cleanData = data;
			if (typeof data === "object" && data !== null) {
				const dataObj = data as Record<string, unknown>;
				if (shouldStripDerivedFields) {
					const { owner, author, requester, ...rest } = dataObj;
					cleanData = rest;

					// Log warning if these fields were present
					if (owner || author || requester) {
						console.warn(
							"⚠️ Removed owner/author/requester from request - backend derives from session",
							{ endpoint, removed: { owner, author, requester } },
						);
					}
				} else {
					cleanData = dataObj;
				}
			}

			const requestData =
				sessionToken && typeof cleanData === "object" && cleanData !== null
					? { session: sessionToken, ...cleanData }
					: cleanData;

			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestData),
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

// Session token management
function getSessionToken(): string | null {
	return userStorage.getAuthToken(); // getAuthToken now returns session token
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
	// Register - public endpoint, returns user ID
	async register(data: UserRegistration): Promise<{ user: ID }> {
		// Don't inject session for registration
		const sessionToken = getSessionToken();
		const response = await apiRequest<{ user: ID }>("/User/registerUser", data);
		// Manually restore session token if it was there
		if (sessionToken) {
			userStorage.setAuthToken(sessionToken);
		}
		return response;
	},

	// Login - public endpoint, returns user ID and session token
	async login(data: UserLogin): Promise<{ user: ID; session: string }> {
		// Don't inject session for login
		const response = await apiRequest<{ user: ID; session: string }>(
			"/User/login",
			data,
		);
		return response;
	},

	// Logout - destroys session
	async logout(session: string): Promise<void> {
		await apiRequest("/Sessioning/deleteSession", { session });
	},

	// Update profile - protected endpoint
	async updateProfile(data: UserUpdate): Promise<ActionResponse> {
		return apiRequest("/User/updateProfile", data);
	},

	// Query user details - public endpoint
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

	// Query user ID by username - public endpoint
	async getUserIDByUsername(username: string): Promise<ID> {
		const response = await apiRequest("/User/_getUserIDByUsername", {
			username,
		});
		const entries = Array.isArray(response) ? response : [response];
		const firstEntry = entries[0];

		if (firstEntry == null) {
			throw new ApiError("User not found.", 404);
		}

		if (typeof firstEntry === "object") {
			const entry = firstEntry as Record<string, unknown>;

			if ("error" in entry) {
				const message =
					typeof entry.error === "string"
						? (entry.error as string)
						: "User not found.";
				throw new ApiError(message, 404);
			}

			if ("user" in entry && typeof entry.user === "string") {
				const userId = (entry.user as string).trim();
				if (!userId) {
					throw new ApiError("User not found.", 404);
				}
				return userId as ID;
			}
		}

		if (typeof firstEntry === "string") {
			const userId = firstEntry.trim();
			if (!userId) {
				throw new ApiError("User not found.", 404);
			}
			return userId as ID;
		}

		throw new ApiError("Unexpected response while looking up user ID.", 500);
	},
};

// Recipe API
export const recipeApi = {
	// Create recipe - protected endpoint (session required, backend derives owner)
	async createRecipe(
		data: Omit<RecipeCreate, "owner">,
	): Promise<{ recipe: ID }> {
		return apiRequest<{ recipe: ID }>("/Recipe/createRecipe", data);
	},

	// Add tag - public endpoint
	async addTag(recipeId: ID, tag: string): Promise<ActionResponse> {
		return apiRequest("/Recipe/addTag", { recipe: recipeId, tag });
	},

	// Remove tag - public endpoint
	async removeTag(recipeId: ID, tag: string): Promise<ActionResponse> {
		return apiRequest("/Recipe/removeTag", { recipe: recipeId, tag });
	},

	// Delete recipe - protected endpoint (session required, backend derives requester)
	async deleteRecipe(recipeId: ID): Promise<ActionResponse> {
		return apiRequest("/Recipe/deleteRecipe", {
			recipe: recipeId,
		});
	},

	// Update recipe - protected endpoint (session required, backend derives owner)
	async updateRecipeDetails(
		data: Omit<RecipeUpdate, "owner">,
	): Promise<ActionResponse> {
		return apiRequest("/Recipe/updateRecipeDetails", data);
	},

	// Get recipe by ID - public query endpoint
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

	// List recipes by owner - public query endpoint
	async listRecipesByOwner(ownerId: ID): Promise<Recipe[]> {
		const response = await apiRequest("/Recipe/_listRecipesByOwner", {
			owner: ownerId,
		});
		return parseQueryResponse<Recipe>(response, "recipe");
	},

	// Search recipes by tag - public query endpoint
	async searchRecipesByTag(tag: string): Promise<Recipe[]> {
		const response = await apiRequest("/Recipe/_searchRecipesByTag", { tag });
		return parseQueryResponse<Recipe>(response, "recipe");
	},

	// Get fork count - public query endpoint
	async getForkCount(recipeId: ID): Promise<{ count: number }> {
		return apiRequest<{ count: number }>("/Recipe/_getForkCount", {
			recipe: recipeId,
		});
	},

	// List forks of recipe - public query endpoint
	async listForksOfRecipe(recipeId: ID): Promise<Recipe[]> {
		const response = await apiRequest("/Recipe/_listForksOfRecipe", {
			recipe: recipeId,
		});
		return parseQueryResponse<Recipe>(response, "recipe");
	},

	// Get recipes by IDs - helper method using getRecipeById
	async getRecipesByIds(recipeIds: ID[]): Promise<Recipe[]> {
		if (recipeIds.length === 0) return [];

		// Fetch each recipe individually
		const recipes = await Promise.all(
			recipeIds.map((id) => this.getRecipeById(id)),
		);

		return recipes.filter((recipe) => recipe !== null) as Recipe[];
	},

	// Draft recipe with AI - protected endpoint (session required, backend derives author)
	async draftRecipeWithAI(
		recipe: string,
		goal: string,
	): Promise<{
		draftId: ID;
		baseRecipe: ID;
		requester: ID;
		goal: string;
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
		confidence: number;
		created: string;
		expires: string;
	}> {
		return apiRequest("/Recipe/draftRecipeWithAI", {
			recipe,
			goal,
		});
	},

	// Apply draft - protected endpoint (session required, backend derives owner)
	async applyDraft(
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
			recipe,
			draftDetails,
		});
	},
};

// Annotation API
export const annotationApi = {
	// Create annotation - protected endpoint (session required, backend derives author)
	async annotate(
		data: Omit<AnnotationCreate, "author">,
	): Promise<{ annotation: ID }> {
		return apiRequest<{ annotation: ID }>("/Annotation/annotate", data);
	},

	// Edit annotation - protected endpoint (session required, backend derives author)
	async editAnnotation(
		data: Omit<AnnotationUpdate, "author">,
	): Promise<ActionResponse> {
		return apiRequest("/Annotation/editAnnotation", data);
	},

	// Resolve annotation - protected endpoint (session required, backend derives resolver)
	async resolveAnnotation(
		data: Omit<AnnotationResolve, "resolver">,
	): Promise<ActionResponse> {
		return apiRequest("/Annotation/resolveAnnotation", data);
	},

	// Delete annotation - protected endpoint (session required, backend derives author)
	async deleteAnnotation(annotationId: string): Promise<ActionResponse> {
		return apiRequest("/Annotation/deleteAnnotation", {
			annotation: annotationId,
		});
	},

	// Get annotations for recipe - public query endpoint
	async getAnnotationsForRecipe(recipeId: string): Promise<Annotation[]> {
		const response = await apiRequest("/Annotation/_getAnnotationsForRecipe", {
			recipe: recipeId,
		});
		return parseQueryResponse<Annotation>(response, "annotation");
	},

	// Get annotation by ID - public query endpoint
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
	// Create notebook - protected endpoint (session required, backend derives owner)
	async createNotebook(
		data: Omit<NotebookCreate, "owner">,
	): Promise<{ notebook: ID }> {
		return apiRequest<{ notebook: ID }>("/Notebook/createNotebook", data);
	},

	// Invite member - protected endpoint (session required, backend derives owner)
	async inviteMember(
		data: Omit<NotebookInvite, "owner">,
	): Promise<ActionResponse> {
		return apiRequest("/Notebook/inviteMember", data);
	},

	// Remove member - protected endpoint (session required, backend derives owner)
	async removeMember(notebookId: ID, memberId: ID): Promise<ActionResponse> {
		return apiRequest("/Notebook/removeMember", {
			notebook: notebookId,
			member: memberId,
		});
	},

	// Share recipe - protected endpoint (session required, backend derives sharer)
	async shareRecipe(
		data: Omit<NotebookShare, "sharer">,
	): Promise<ActionResponse> {
		return apiRequest("/Notebook/shareRecipe", data);
	},

	// Unshare recipe - protected endpoint (session required, backend derives requester)
	async unshareRecipe(recipeId: ID, notebookId: ID): Promise<ActionResponse> {
		return apiRequest("/Notebook/unshareRecipe", {
			recipe: recipeId,
			notebook: notebookId,
		});
	},

	// Delete notebook - protected endpoint (session required, backend derives owner)
	async deleteNotebook(notebookId: ID): Promise<ActionResponse> {
		return apiRequest("/Notebook/deleteNotebook", {
			notebook: notebookId,
		});
	},

	// Get notebook by ID - public query endpoint
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

	// Get notebooks by owner - public query endpoint
	async getNotebooksByOwner(ownerId: ID): Promise<Notebook[]> {
		const response = await apiRequest("/Notebook/_getNotebooksByOwner", {
			owner: ownerId,
		});
		return parseQueryResponse<Notebook>(response, "notebook");
	},

	// Get notebooks containing recipe - public query endpoint
	async getNotebooksContainingRecipe(recipeId: ID): Promise<Notebook[]> {
		const response = await apiRequest(
			"/Notebook/_getNotebooksContainingRecipe",
			{
				recipe: recipeId,
			},
		);
		return parseQueryResponse<Notebook>(response, "notebook");
	},

	// Get notebooks where user is a member - public query endpoint
	async getNotebooksWithMember(memberId: ID): Promise<Notebook[]> {
		const response = await apiRequest("/Notebook/_getNotebooksWithMember", {
			member: memberId,
		});
		return parseQueryResponse<Notebook>(response, "notebook");
	},
};

export { ApiError };
