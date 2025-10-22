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
	const currentNotebook = ref<Notebook | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	// Ensure notebooks is always an array
	const safeNotebooks = computed(() => notebooks.value || []);

	const authStore = useAuthStore();

	const userNotebooks = computed(() => {
		console.log(
			"🔍 userNotebooks computed - authStore.userId:",
			authStore.userId,
		);
		console.log(
			"🔍 userNotebooks computed - safeNotebooks.value:",
			safeNotebooks.value,
		);
		if (!authStore.userId) return [];
		const filtered = safeNotebooks.value.filter(
			(notebook) => notebook.owner === authStore.userId,
		);
		console.log("🔍 userNotebooks computed - filtered result:", filtered);
		return filtered;
	});

	const sharedNotebooks = computed(() => {
		if (!authStore.userId) return [];
		const filtered = safeNotebooks.value.filter(
			(notebook) =>
				notebook.members.includes(authStore.userId as ID) &&
				notebook.owner !== authStore.userId,
		);
		console.log(
			"🔍 sharedNotebooks computed - authStore.userId:",
			authStore.userId,
		);
		console.log(
			"🔍 sharedNotebooks computed - safeNotebooks.value:",
			safeNotebooks.value,
		);
		console.log("🔍 sharedNotebooks computed - filtered result:", filtered);
		return filtered;
	});

	async function createNotebook(
		notebookData: Omit<NotebookCreate, "owner">,
	): Promise<ID> {
		if (!authStore.userId) {
			throw new Error("User must be logged in to create notebooks");
		}

		isLoading.value = true;
		error.value = null;

		try {
			console.log(
				"🔍 createNotebook - creating notebook with data:",
				notebookData,
			);
			const response = await notebookApi.createNotebook({
				...notebookData,
				owner: authStore.userId,
			});
			console.log("🔍 createNotebook - API response:", response);

			// Refresh user notebooks
			console.log("🔍 createNotebook - refreshing user notebooks");
			await loadUserNotebooks();

			// If the API didn't return the new notebook, try to add it manually
			const newNotebookId = response.notebook as ID;
			const existingNotebook = notebooks.value.find(
				(n) => n._id === newNotebookId,
			);
			if (!existingNotebook) {
				console.log(
					"🔍 createNotebook - API didn't return new notebook, adding manually",
				);
				const newNotebook: Notebook = {
					_id: newNotebookId,
					owner: authStore.userId,
					title: notebookData.title,
					description: notebookData.description,
					members: [authStore.userId],
					recipes: [],
					created: new Date().toISOString(),
				};
				notebooks.value = [...notebooks.value, newNotebook];
			}

			// Force a reactive update by triggering a re-computation
			console.log(
				"🔍 createNotebook - notebooks after refresh:",
				notebooks.value,
			);
			console.log(
				"🔍 createNotebook - userNotebooks after refresh:",
				userNotebooks.value,
			);

			return response.notebook as ID;
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
				"🔍 loadUserNotebooks - calling API for userId:",
				authStore.userId,
			);
			const response = await notebookApi.getNotebooksByOwner(authStore.userId);
			console.log("🔍 loadUserNotebooks - API response:", response);

			let notebookArray: Notebook[] = [];

			// Handle different response structures
			if (Array.isArray(response)) {
				notebookArray = response;
			} else if (
				response &&
				typeof response === "object" &&
				"notebook" in response
			) {
				const notebookData = (response as any).notebook;
				if (Array.isArray(notebookData)) {
					notebookArray = notebookData;
				} else {
					notebookArray = [notebookData];
				}
			} else if (
				response &&
				typeof response === "object" &&
				"data" in response
			) {
				const data = (response as any).data;
				if (Array.isArray(data)) {
					notebookArray = data;
				} else {
					notebookArray = [data];
				}
			}

			console.log(
				"🔍 loadUserNotebooks - processed notebookArray:",
				notebookArray,
			);
			notebooks.value = notebookArray;
			console.log(
				"🔍 loadUserNotebooks - notebooks.value after update:",
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

	async function loadAllUserNotebooks(): Promise<void> {
		if (!authStore.userId) {
			return;
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Load owned notebooks
			await loadUserNotebooks();

			// Load shared notebooks where user is a member
			console.log(
				"🔍 loadAllUserNotebooks - loading shared notebooks for userId:",
				authStore.userId,
			);
			const sharedNotebooks = await notebookApi.getNotebooksByMember(
				authStore.userId,
			);
			console.log(
				"🔍 loadAllUserNotebooks - shared notebooks response:",
				sharedNotebooks,
			);
			console.log(
				"🔍 loadAllUserNotebooks - shared notebooks count:",
				sharedNotebooks.length,
			);

			// Add shared notebooks to the notebooks array if not already present
			let addedCount = 0;
			sharedNotebooks.forEach((sharedNotebook) => {
				const existingNotebook = notebooks.value.find(
					(n) => n._id === sharedNotebook._id,
				);
				if (!existingNotebook) {
					notebooks.value.push(sharedNotebook);
					addedCount++;
					console.log(
						"🔍 loadAllUserNotebooks - added shared notebook:",
						sharedNotebook.title,
						sharedNotebook._id,
					);
				} else {
					console.log(
						"🔍 loadAllUserNotebooks - notebook already exists:",
						sharedNotebook.title,
						sharedNotebook._id,
					);
				}
			});

			console.log(
				"🔍 loadAllUserNotebooks - added",
				addedCount,
				"shared notebooks",
			);
			console.log(
				"🔍 loadAllUserNotebooks - final notebooks array:",
				notebooks.value,
			);
			console.log(
				"🔍 loadAllUserNotebooks - final notebooks count:",
				notebooks.value.length,
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
			const notebook = await notebookApi.getNotebookById(notebookId);

			// Ensure arrays are properly initialized
			if (!notebook.members) notebook.members = [];
			if (!notebook.recipes) notebook.recipes = [];

			currentNotebook.value = notebook;
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

	async function inviteMember(data: NotebookInvite): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
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
		if (!authStore.userId) {
			throw new Error("User must be logged in to remove members");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await notebookApi.removeMember(authStore.userId, notebookId, memberId);
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

	async function shareRecipe(data: NotebookShare): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
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
		if (!authStore.userId) {
			throw new Error("User must be logged in to unshare recipes");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await notebookApi.unshareRecipe(authStore.userId, recipeId, notebookId);
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
		if (!authStore.userId) {
			throw new Error("User must be logged in to delete notebooks");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await notebookApi.deleteNotebook(authStore.userId, notebookId);

			// Remove from local state
			notebooks.value = notebooks.value.filter(
				(notebook) => notebook._id !== notebookId,
			);
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
