import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, notebookApi } from "@/services/api";
import type {
	ID,
	Notebook,
	NotebookCreate,
	NotebookInvite,
	NotebookShare,
} from "@/types/api";
import { useAuthStore } from "./auth";

export const useNotebookStore = defineStore("notebook", () => {
	const notebooks = ref<Notebook[]>([]);
	const ownedNotebooks = ref<Notebook[]>([]);
	const memberNotebooks = ref<Notebook[]>([]);
	const currentNotebook = ref<Notebook | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const authStore = useAuthStore();

	const userNotebooks = computed(() => {
		console.log(
			"🔍 userNotebooks computed - authStore.userId:",
			authStore.userId,
		);
		if (!authStore.userId) return [];
		console.log(
			"🔍 userNotebooks computed - ownedNotebooks:",
			ownedNotebooks.value,
		);
		return ownedNotebooks.value;
	});

	const sharedNotebooks = computed(() => {
		if (!authStore.userId) return [];
		console.log(
			"🔍 sharedNotebooks computed - authStore.userId:",
			authStore.userId,
		);
		console.log(
			"🔍 sharedNotebooks computed - memberNotebooks:",
			memberNotebooks.value,
		);
		return memberNotebooks.value;
	});

	function normalizeNotebook(notebook: Notebook): Notebook {
		const normalizedMembers = Array.isArray(notebook.members)
			? notebook.members.map((member) => member as ID)
			: [];
		const normalizedRecipes = Array.isArray(notebook.recipes)
			? notebook.recipes.map((recipe) => recipe as ID)
			: [];

		return {
			...notebook,
			members: normalizedMembers,
			recipes: normalizedRecipes,
			description: notebook.description ?? "",
		};
	}

	function mergeNotebooks(): void {
		const combined = [...ownedNotebooks.value, ...memberNotebooks.value];
		const byId = new Map<ID, Notebook>();
		for (const notebook of combined) {
			const existing = byId.get(notebook._id);
			if (existing) {
				byId.set(notebook._id, { ...existing, ...notebook });
			} else {
				byId.set(notebook._id, { ...notebook });
			}
		}
		notebooks.value = Array.from(byId.values());
	}

	async function fetchOwnedNotebooks(): Promise<Notebook[]> {
		if (!authStore.userId) return [];
		const response = await notebookApi.getNotebooksByOwner(authStore.userId);
		return response.map(normalizeNotebook);
	}

	async function fetchMemberNotebooks(): Promise<Notebook[]> {
		if (!authStore.userId) return [];
		const response = await notebookApi.getNotebooksWithMember(authStore.userId);
		return response
			.map(normalizeNotebook)
			.filter((notebook) => notebook.owner !== authStore.userId);
	}

	async function createNotebook(
		notebookData: Omit<NotebookCreate, "owner">,
	): Promise<ID> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to create notebooks");
		}

		isLoading.value = true;
		error.value = null;

		try {
			console.log(
				"🔍 createNotebook - creating notebook with data:",
				notebookData,
			);
			// Backend derives owner from session token
			const response = await notebookApi.createNotebook(notebookData);
			console.log("🔍 createNotebook - API response:", response);

			// Refresh both owned and shared notebooks
			console.log("🔍 createNotebook - refreshing notebooks");
			await loadAllUserNotebooks();

			// Force a reactive update by triggering a re-computation
			console.log(
				"🔍 createNotebook - notebooks after refresh:",
				notebooks.value,
			);
			console.log(
				"🔍 createNotebook - userNotebooks after refresh:",
				userNotebooks.value,
			);
			console.log(
				"🔍 createNotebook - sharedNotebooks after refresh:",
				sharedNotebooks.value,
			);

			return response.notebook;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to create notebook. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function loadUserNotebooks(): Promise<void> {
		if (!authStore.userId) {
			return;
		}

		isLoading.value = true;
		error.value = null;

		try {
			console.log(
				"🔍 loadUserNotebooks - fetching owned notebooks for userId:",
				authStore.userId,
			);
			const owned = await fetchOwnedNotebooks();
			ownedNotebooks.value = owned;
			mergeNotebooks();
			console.log(
				"🔍 loadUserNotebooks - ownedNotebooks:",
				ownedNotebooks.value,
			);
			console.log(
				"🔍 loadUserNotebooks - notebooks after merge:",
				notebooks.value,
			);
		} catch (err) {
			console.error("🔍 loadUserNotebooks - error:", err);
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to load notebooks. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function loadSharedNotebooks(): Promise<void> {
		if (!authStore.userId) {
			return;
		}

		isLoading.value = true;
		error.value = null;

		try {
			console.log(
				"🔍 loadSharedNotebooks - fetching member notebooks for userId:",
				authStore.userId,
			);
			const shared = await fetchMemberNotebooks();
			memberNotebooks.value = shared;
			mergeNotebooks();
			console.log(
				"🔍 loadSharedNotebooks - memberNotebooks:",
				memberNotebooks.value,
			);
			console.log(
				"🔍 loadSharedNotebooks - notebooks after merge:",
				notebooks.value,
			);
		} catch (err) {
			console.error("🔍 loadSharedNotebooks - error:", err);
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to load shared notebooks. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function loadAllUserNotebooks(): Promise<void> {
		if (!authStore.userId) {
			return;
		}

		isLoading.value = true;
		error.value = null;

		try {
			const [owned, shared] = await Promise.all([
				fetchOwnedNotebooks(),
				fetchMemberNotebooks(),
			]);
			ownedNotebooks.value = owned;
			memberNotebooks.value = shared;
			mergeNotebooks();
			console.log(
				"🔍 loadAllUserNotebooks - ownedNotebooks:",
				ownedNotebooks.value,
			);
			console.log(
				"🔍 loadAllUserNotebooks - memberNotebooks:",
				memberNotebooks.value,
			);
			console.log(
				"🔍 loadAllUserNotebooks - notebooks after merge:",
				notebooks.value,
			);
		} catch (err) {
			console.error("🔍 loadAllUserNotebooks - error:", err);
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to load notebooks. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function loadNotebookById(notebookId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			console.log("🔍 loadNotebookById - loading notebook:", notebookId);
			const notebook = await notebookApi.getNotebookById(notebookId);
			console.log("🔍 loadNotebookById - received notebook:", notebook);
			console.log("🔍 loadNotebookById - notebook._id:", notebook._id);

			// Ensure arrays are properly initialized
			if (!notebook.members) notebook.members = [];
			if (!notebook.recipes) notebook.recipes = [];

			currentNotebook.value = notebook;
			console.log(
				"🔍 loadNotebookById - currentNotebook set to:",
				currentNotebook.value,
			);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to load notebook. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function inviteMember(
		data: Omit<NotebookInvite, "owner">,
	): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to invite members");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives owner from session token
			await notebookApi.inviteMember(data);
			// Refresh the notebook
			if (currentNotebook.value) {
				await loadNotebookById(currentNotebook.value._id);
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to invite member. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function removeMember(notebookId: ID, memberId: ID): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to remove members");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives owner from session token
			await notebookApi.removeMember(notebookId, memberId);
			// Refresh the notebook
			if (currentNotebook.value) {
				await loadNotebookById(currentNotebook.value._id);
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to remove member. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function shareRecipe(
		data: Omit<NotebookShare, "sharer">,
	): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to share recipes");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives sharer from session token
			await notebookApi.shareRecipe(data);
			// Refresh the notebook
			if (currentNotebook.value) {
				await loadNotebookById(currentNotebook.value._id);
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to share recipe. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function unshareRecipe(recipeId: ID, notebookId: ID): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to unshare recipes");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives requester from session token
			await notebookApi.unshareRecipe(recipeId, notebookId);
			// Refresh the notebook
			if (currentNotebook.value) {
				await loadNotebookById(currentNotebook.value._id);
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to unshare recipe. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function deleteNotebook(notebookId: ID): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to delete notebooks");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives owner from session token
			await notebookApi.deleteNotebook(notebookId);

			// Remove from local state
			ownedNotebooks.value = ownedNotebooks.value.filter(
				(notebook) => notebook._id !== notebookId,
			);
			memberNotebooks.value = memberNotebooks.value.filter(
				(notebook) => notebook._id !== notebookId,
			);
			mergeNotebooks();
			if (currentNotebook.value?._id === notebookId) {
				currentNotebook.value = null;
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to delete notebook. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	function clearError(): void {
		error.value = null;
	}

	function clearCurrentNotebook(): void {
		currentNotebook.value = null;
	}

	async function getNotebooksContainingRecipe(
		recipeId: ID,
	): Promise<Notebook[]> {
		isLoading.value = true;
		error.value = null;

		try {
			const notebooksWithRecipe =
				await notebookApi.getNotebooksContainingRecipe(recipeId);
			return notebooksWithRecipe;
		} catch (err) {
			console.error("🔍 getNotebooksContainingRecipe - error:", err);
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to load notebooks containing recipe.";
			}
			return [];
		} finally {
			isLoading.value = false;
		}
	}

	return {
		// State
		notebooks,
		currentNotebook,
		isLoading,
		error,

		// Computed
		userNotebooks,
		sharedNotebooks,

		// Actions
		createNotebook,
		loadUserNotebooks,
		loadSharedNotebooks,
		loadAllUserNotebooks,
		loadNotebookById,
		inviteMember,
		removeMember,
		shareRecipe,
		unshareRecipe,
		deleteNotebook,
		getNotebooksContainingRecipe,
		clearError,
		clearCurrentNotebook,
	};
});
