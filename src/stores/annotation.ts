import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, annotationApi } from "@/services/api";
import type { Annotation, AnnotationCreate, ID } from "@/types/api";
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
		return "Annotation not found.";
	}
	if (error.status && error.status >= 500) {
		return "Server error. Please try again later.";
	}
	if (error.status === 429) {
		return "Too many requests. Please wait a moment and try again.";
	}
	return error.message || "An unexpected error occurred.";
}

export const useAnnotationStore = defineStore("annotation", () => {
	const annotations = ref<Annotation[]>([]);
	const currentAnnotation = ref<Annotation | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const authStore = useAuthStore();

	const annotationsByRecipe = computed(() => {
		return (recipeId: ID) =>
			annotations.value.filter((annotation) => annotation.recipe === recipeId);
	});

	const annotationsByAuthor = computed(() => {
		return (authorId: ID) =>
			annotations.value.filter((annotation) => annotation.author === authorId);
	});

	const unresolvedAnnotations = computed(() => {
		return annotations.value.filter((annotation) => !annotation.resolved);
	});

	async function createAnnotation(
		annotationData: Omit<AnnotationCreate, "author">,
	): Promise<ID> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to create annotations");
		}

		isLoading.value = true;
		error.value = null;

		// Optimistic update - add temporary annotation immediately
		const tempId = `temp-${Date.now()}`;
		const optimisticAnnotation: Annotation = {
			_id: tempId,
			author: authStore.userId!,
			recipe: annotationData.recipe,
			targetKind: annotationData.targetKind,
			targetIndex: annotationData.index,
			text: annotationData.text,
			created: new Date().toISOString(),
			resolved: false,
		};
		annotations.value = [...annotations.value, optimisticAnnotation];

		try {
			// Backend derives author from session token
			const response = await annotationApi.annotate(annotationData);

			// Replace optimistic annotation with real one
			annotations.value = annotations.value.map((a) =>
				a._id === tempId
					? { ...optimisticAnnotation, _id: response.annotation }
					: a,
			);

			return response.annotation;
		} catch (err) {
			// Remove optimistic annotation on error
			annotations.value = annotations.value.filter((a) => a._id !== tempId);

			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to create annotation. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function loadAnnotationsForRecipe(recipeId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const annotationList =
				await annotationApi.getAnnotationsForRecipe(recipeId);
			annotations.value = annotationList;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load annotations. Please try again.";
			}
		} finally {
			isLoading.value = false;
		}
	}

	async function loadAnnotationById(annotationId: ID): Promise<void> {
		isLoading.value = true;
		error.value = null;

		try {
			const annotation = await annotationApi.getAnnotationById(annotationId);
			currentAnnotation.value = annotation;
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Failed to load annotation. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function updateAnnotation(
		annotationId: ID,
		newText: string,
	): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to update annotations");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives author from session token
			await annotationApi.editAnnotation({
				annotation: annotationId,
				newText,
			});

			// Update local state
			const annotation = annotations.value.find((a) => a._id === annotationId);
			if (annotation) {
				annotation.text = newText;
			}

			if (currentAnnotation.value?._id === annotationId) {
				currentAnnotation.value.text = newText;
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to update annotation. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function resolveAnnotation(
		annotationId: ID,
		resolved: boolean,
	): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to resolve annotations");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives resolver from session token
			await annotationApi.resolveAnnotation({
				annotation: annotationId,
				resolved,
			});

			// Update local state
			const annotation = annotations.value.find((a) => a._id === annotationId);
			if (annotation) {
				annotation.resolved = resolved;
			}

			if (currentAnnotation.value?._id === annotationId) {
				currentAnnotation.value.resolved = resolved;
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to resolve annotation. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function deleteAnnotation(annotationId: ID): Promise<void> {
		if (!authStore.isAuthenticated) {
			throw new Error("User must be logged in to delete annotations");
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Backend derives author from session token
			await annotationApi.deleteAnnotation(annotationId);

			// Remove from local state
			annotations.value = annotations.value.filter(
				(annotation) => annotation._id !== annotationId,
			);
			if (currentAnnotation.value?._id === annotationId) {
				currentAnnotation.value = null;
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to delete annotation. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	function clearError(): void {
		error.value = null;
	}

	function clearCurrentAnnotation(): void {
		currentAnnotation.value = null;
	}

	return {
		// State
		annotations,
		currentAnnotation,
		isLoading,
		error,

		// Computed
		annotationsByRecipe,
		annotationsByAuthor,
		unresolvedAnnotations,

		// Actions
		createAnnotation,
		loadAnnotationsForRecipe,
		loadAnnotationById,
		updateAnnotation,
		resolveAnnotation,
		deleteAnnotation,
		clearError,
		clearCurrentAnnotation,
	};
});
