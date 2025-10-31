import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, versionApi } from "@/services/api";
import type { ID, Version, VersionCreate } from "@/types/api";
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
		return "Version not found.";
	}
	if (error.status && error.status >= 500) {
		return "Server error. Please try again later.";
	}
	if (error.status === 429) {
		return "Too many requests. Please wait a moment and try again.";
	}
	return error.message || "An unexpected error occurred.";
}

export const useVersionStore = defineStore("version", () => {
	const versions = ref<Version[]>([]);
	const currentVersion = ref<Version | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const authStore = useAuthStore();

	const versionsByRecipe = computed(() => {
		return (recipeId: ID) =>
			versions.value?.filter((version) => version.baseRecipe === recipeId) ||
			[];
	});

	const versionsByAuthor = computed(() => {
		return (authorId: ID) =>
			versions.value?.filter((version) => version.author === authorId) || [];
	});

	async function createVersion(
		versionData: Omit<VersionCreate, "author">,
	): Promise<ID> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to create versions");
		}

		isLoading.value = true;
		error.value = null;

		try {
			const response = await versionApi.createVersion({
				...versionData,
				author: authStore.userId,
			});

			// Refresh versions for the recipe
			await loadVersionsByRecipe(versionData.recipe);

			return response.version as ID;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to create version. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function loadVersionsByRecipe(recipeId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const versionList = await versionApi.listVersionsByRecipe(recipeId);
			// Merge with existing versions, avoiding duplicates
			const existingIds = new Set(versions.value.map((v) => v.id));
			const newVersions = versionList.filter((v) => !existingIds.has(v.id));
			versions.value = [...versions.value, ...newVersions];
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load versions. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function loadVersionById(versionId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const version = await versionApi.getVersionById(versionId);

			// Ensure arrays are properly initialized
			if (!version.ingredients) version.ingredients = [];
			if (!version.steps) version.steps = [];
			if (!version.promptHistory) version.promptHistory = [];

			currentVersion.value = version;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load version. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function loadVersionsByAuthor(authorId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const versionList = await versionApi.listVersionsByAuthor(authorId);
			versions.value = versionList;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load versions. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function deleteVersion(versionId: ID): Promise<void> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to delete versions");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await versionApi.deleteVersion(authStore.userId, versionId);

			// Remove from local state
			versions.value =
				versions.value?.filter((version) => version.id !== versionId) || [];
			if (currentVersion.value?.id === versionId) {
				currentVersion.value = null;
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to delete version. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function draftVersionWithAI(
		recipeId: ID,
		goal: string,
		options: Record<string, unknown> = {},
	): Promise<void> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to draft versions");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await versionApi.draftVersionWithAI(
				authStore.userId,
				recipeId,
				goal,
				options,
			);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to draft version with AI. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function approveDraft(
		draftData: Record<string, unknown>,
	): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			await versionApi.approveDraft(draftData);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to approve draft. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function rejectDraft(
		draftId: string,
		baseRecipe: string,
		goal: string,
	): Promise<void> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to reject drafts");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await versionApi.rejectDraft(authStore.userId, draftId, baseRecipe, goal);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to reject draft. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	function clearError(): void {
		error.value = null;
	}

	function clearCurrentVersion(): void {
		currentVersion.value = null;
	}

	return {
		// State
		versions,
		currentVersion,
		isLoading,
		error,

		// Computed
		versionsByRecipe,
		versionsByAuthor,

		// Actions
		createVersion,
		loadVersionsByRecipe,
		loadVersionById,
		loadVersionsByAuthor,
		deleteVersion,
		draftVersionWithAI,
		approveDraft,
		rejectDraft,
		clearError,
		clearCurrentVersion,
	};
});
