// Optimistic update utilities for better UX
import type { Ref } from "vue";

export interface OptimisticUpdateOptions<T> {
	optimisticUpdate: () => void;
	rollback: () => void;
	apiCall: () => Promise<T>;
	onSuccess?: (result: T) => void;
	onError?: (error: Error) => void;
}

/**
 * Performs an optimistic update with automatic rollback on failure
 */
export async function performOptimisticUpdate<T>({
	optimisticUpdate,
	rollback,
	apiCall,
	onSuccess,
	onError,
}: OptimisticUpdateOptions<T>): Promise<T> {
	// Apply optimistic update immediately
	optimisticUpdate();

	try {
		const result = await apiCall();
		onSuccess?.(result);
		return result;
	} catch (error) {
		// Rollback on failure
		rollback();
		onError?.(error as Error);
		throw error;
	}
}

/**
 * Creates optimistic update functions for array operations
 */
export function createArrayOptimisticUpdate<T>(
	arrayRef: Ref<T[]>,
	getId: (item: T) => string,
) {
	return {
		add: (newItem: T) => ({
			optimisticUpdate: () => {
				arrayRef.value = [...arrayRef.value, newItem];
			},
			rollback: () => {
				arrayRef.value = arrayRef.value.filter(
					(item) => getId(item) !== getId(newItem),
				);
			},
		}),

		remove: (itemId: string) => {
			const originalItem = arrayRef.value.find(
				(item) => getId(item) === itemId,
			);
			return {
				optimisticUpdate: () => {
					arrayRef.value = arrayRef.value.filter(
						(item) => getId(item) !== itemId,
					);
				},
				rollback: () => {
					if (originalItem) {
						arrayRef.value = [...arrayRef.value, originalItem];
					}
				},
			};
		},

		update: (itemId: string, updates: Partial<T>) => {
			const originalItem = arrayRef.value.find(
				(item) => getId(item) === itemId,
			);
			return {
				optimisticUpdate: () => {
					arrayRef.value = arrayRef.value.map((item) =>
						getId(item) === itemId ? { ...item, ...updates } : item,
					);
				},
				rollback: () => {
					if (originalItem) {
						arrayRef.value = arrayRef.value.map((item) =>
							getId(item) === itemId ? originalItem : item,
						);
					}
				},
			};
		},
	};
}

/**
 * Creates optimistic update functions for single object operations
 */
export function createObjectOptimisticUpdate<T>(objectRef: Ref<T | null>) {
	return {
		set: (newValue: T) => ({
			optimisticUpdate: () => {
				objectRef.value = newValue;
			},
			rollback: () => {
				objectRef.value = null;
			},
		}),

		update: (updates: Partial<T>) => {
			const originalValue = objectRef.value;
			return {
				optimisticUpdate: () => {
					if (objectRef.value) {
						objectRef.value = { ...objectRef.value, ...updates };
					}
				},
				rollback: () => {
					objectRef.value = originalValue;
				},
			};
		},

		clear: () => ({
			optimisticUpdate: () => {
				objectRef.value = null;
			},
			rollback: () => {
				// Rollback would need the original value, which we don't have
				// This is a limitation of the simple approach
			},
		}),
	};
}
