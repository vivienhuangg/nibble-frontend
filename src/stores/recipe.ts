import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, recipeApi } from "@/services/api";
import type { ID, Recipe, RecipeCreate, RecipeUpdate } from "@/types/api";
import {
	createArrayOptimisticUpdate,
	createObjectOptimisticUpdate,
	performOptimisticUpdate,
} from "@/utils/optimisticUpdates";
import {
	formatValidationErrors,
	validateRecipeCreate,
	validateRecipeUpdate,
} from "@/utils/validation";
import { useAuthStore } from "./auth";

// Utility function to get user-friendly error messages
function getErrorMessage(error: ApiError): string {
	if (error.status === 401) {
		return "Please log in to perform this action.";
	}
	if (error.status === 403) {
		return "You don't have permission to perform this action.";
	}
	if (error.status === 404) {
		return "Recipe not found.";
	}
	if (error.status && error.status >= 500) {
		return "Server error. Please try again later.";
	}
	if (error.status === 429) {
		return "Too many requests. Please wait a moment and try again.";
	}
	return error.message || "An unexpected error occurred.";
}

export const useRecipeStore = defineStore("recipe", () => {
	const recipes = ref<Recipe[]>([]);
	const currentRecipe = ref<Recipe | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const authStore = useAuthStore();

	// Create optimistic update helpers
	const recipesOptimistic = createArrayOptimisticUpdate(
		recipes,
		(recipe) => recipe._id,
	);
	const currentRecipeOptimistic = createObjectOptimisticUpdate(currentRecipe);

	const userRecipes = computed(() => {
		if (!authStore.userId) return [];
		return recipes.value.filter((recipe) => recipe.owner === authStore.userId);
	});

	const recipesByTag = computed(() => {
		return (tag: string) =>
			recipes.value.filter((recipe) => recipe.tags.includes(tag));
	});

	async function createRecipe(
		recipeData: Omit<RecipeCreate, "owner">,
	): Promise<ID> {
		// Debug logging to understand the auth state
		console.log(
			"🔍 createRecipe - authStore.isAuthenticated:",
			authStore.isAuthenticated,
		);
		console.log("🔍 createRecipe - authStore.userId:", authStore.userId);
		console.log(
			"🔍 createRecipe - authStore.currentUser:",
			authStore.currentUser,
		);
		console.log(
			"🔍 createRecipe - currentUser._id:",
			authStore.currentUser?._id,
		);

		// Get userId from multiple sources for robustness
		const userId = authStore.userId || authStore.currentUser?._id;

		if (!userId) {
			console.error("🔍 createRecipe - No userId found!");
			throw new Error("User must be logged in to create recipes");
		}

		console.log("🔍 createRecipe - Using userId:", userId);

		// Validate input before making API call
		const fullRecipeData = { ...recipeData, owner: userId };
		const validation = validateRecipeCreate(fullRecipeData);
		if (!validation.isValid) {
			error.value = formatValidationErrors(validation.errors);
			throw new Error(error.value);
		}

		isLoading.value = true;
		error.value = null;

		try {
			const response = await recipeApi.createRecipe(fullRecipeData);

			// Refresh user recipes
			await loadUserRecipes();

			return response.recipe as ID;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to create recipe. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function loadUserRecipes(): Promise<void> {
		const userId = authStore.userId || authStore.currentUser?._id;
		if (!userId) {
			console.log("🔍 loadUserRecipes - no userId, returning early");
			return;
		}

		console.log("🔍 loadUserRecipes - loading recipes for userId:", userId);
		isLoading.value = true;
		error.value = null;

		try {
			const recipeList = await recipeApi.listRecipesByOwner(userId);
			recipes.value = recipeList;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load recipes. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function loadRecipesByIds(recipeIds: ID[]): Promise<Recipe[]> {
		if (recipeIds.length === 0) return [];

		isLoading.value = true;
		error.value = null;

		try {
			const loadedRecipes = await recipeApi.getRecipesByIds(recipeIds);

			// Add to local recipes store if not already present
			loadedRecipes.forEach((recipe) => {
				const existingIndex = recipes.value.findIndex(
					(r) => r._id === recipe._id,
				);
				if (existingIndex === -1) {
					recipes.value.push(recipe);
				} else {
					recipes.value[existingIndex] = recipe;
				}
			});

			return loadedRecipes;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load recipes. Please try again.";
			}
			return [];
		} finally {
			isLoading.value = false;
		}
	}

	async function loadRecipeById(recipeId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const recipe = await recipeApi.getRecipeById(recipeId);

			// Ensure arrays are properly initialized
			if (!recipe.tags) recipe.tags = [];
			if (!recipe.ingredients) recipe.ingredients = [];
			if (!recipe.steps) recipe.steps = [];

			currentRecipe.value = recipe;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load recipe. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function updateRecipe(
		recipeId: ID,
		updates: Omit<RecipeUpdate, "owner" | "recipe">,
	): Promise<void> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to update recipes");
		}

		// Validate input before making API call
		const fullUpdateData = {
			...updates,
			owner: authStore.userId,
			recipe: recipeId,
		};
		const validation = validateRecipeUpdate(fullUpdateData);
		if (!validation.isValid) {
			error.value = formatValidationErrors(validation.errors);
			throw new Error(error.value);
		}

		isLoading.value = true;
		error.value = null;

		try {
			await recipeApi.updateRecipeDetails(fullUpdateData);

			// Refresh the recipe
			await loadRecipeById(recipeId);
			// Refresh user recipes list
			await loadUserRecipes();
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to update recipe. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function deleteRecipe(recipeId: ID): Promise<void> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to delete recipes");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await recipeApi.deleteRecipe(authStore.userId, recipeId);

			// Remove from local state
			recipes.value = recipes.value.filter((recipe) => recipe._id !== recipeId);
			if (currentRecipe.value?._id === recipeId) {
				currentRecipe.value = null;
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to delete recipe. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function addTag(recipeId: ID, tag: string): Promise<void> {
		error.value = null;

		const { optimisticUpdate, rollback } = recipesOptimistic.update(recipeId, {
			tags: [
				...(recipes.value.find((r) => r._id === recipeId)?.tags || []),
				tag,
			],
		});

		const currentRecipeUpdate =
			currentRecipe.value?._id === recipeId
				? currentRecipeOptimistic.update({
						tags: [...(currentRecipe.value?.tags || []), tag],
					})
				: null;

		try {
			await performOptimisticUpdate({
				optimisticUpdate: () => {
					optimisticUpdate();
					currentRecipeUpdate?.optimisticUpdate();
				},
				rollback: () => {
					rollback();
					currentRecipeUpdate?.rollback();
				},
				apiCall: () => recipeApi.addTag(recipeId, tag),
				onError: (err) => {
					if (err instanceof ApiError) {
						error.value = getErrorMessage(err);
					} else {
						error.value = "Failed to add tag. Please try again.";
					}
				},
			});
		} catch (err) {
			// Error handling is done in onError callback
			throw err;
		}
	}

	async function removeTag(recipeId: ID, tag: string): Promise<void> {
		error.value = null;

		const { optimisticUpdate, rollback } = recipesOptimistic.update(recipeId, {
			tags: (recipes.value.find((r) => r._id === recipeId)?.tags || []).filter(
				(t) => t !== tag,
			),
		});

		const currentRecipeUpdate =
			currentRecipe.value?._id === recipeId
				? currentRecipeOptimistic.update({
						tags: (currentRecipe.value?.tags || []).filter((t) => t !== tag),
					})
				: null;

		try {
			await performOptimisticUpdate({
				optimisticUpdate: () => {
					optimisticUpdate();
					currentRecipeUpdate?.optimisticUpdate();
				},
				rollback: () => {
					rollback();
					currentRecipeUpdate?.rollback();
				},
				apiCall: () => recipeApi.removeTag(recipeId, tag),
				onError: (err) => {
					if (err instanceof ApiError) {
						error.value = getErrorMessage(err);
					} else {
						error.value = "Failed to remove tag. Please try again.";
					}
				},
			});
		} catch (err) {
			// Error handling is done in onError callback
			throw err;
		}
	}

	async function searchByTag(tag: string): Promise<Recipe[]> {
		isLoading.value = true;
		error.value = null;

		try {
			const recipeList = await recipeApi.searchRecipesByTag(tag);
			return recipeList;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to search recipes. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	function clearError(): void {
		error.value = null;
	}

	function clearCurrentRecipe(): void {
		currentRecipe.value = null;
	}

	return {
		// State
		recipes,
		currentRecipe,
		isLoading,
		error,

		// Computed
		userRecipes,
		recipesByTag,

		// Actions
		createRecipe,
		loadUserRecipes,
		loadRecipesByIds,
		loadRecipeById,
		updateRecipe,
		deleteRecipe,
		addTag,
		removeTag,
		searchByTag,
		clearError,
		clearCurrentRecipe,
	};
});
