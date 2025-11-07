import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, userApi } from "@/services/api";
import type { ID, User } from "@/types/api";
import { setupStorageListener, userStorage } from "@/utils/secureStorage";
import {
	formatValidationErrors,
	validateUserLogin,
	validateUserRegistration,
} from "@/utils/validation";

// Utility function to get user-friendly error messages
function getErrorMessage(error: ApiError): string {
	if (error.status === 401) {
		return "Invalid username or password. Please check your credentials.";
	}
	if (error.status === 403) {
		return "Access denied. Please contact support.";
	}
	if (error.status === 404) {
		return "User not found. Please check your username.";
	}
	if (error.status === 409) {
		return "An account with this username already exists.";
	}
	if (error.status && error.status >= 500) {
		return "Server error. Please try again later.";
	}
	if (error.status === 429) {
		return "Too many requests. Please wait a moment and try again.";
	}
	return error.message || "An unexpected error occurred.";
}

export const useAuthStore = defineStore("auth", () => {
	const currentUser = ref<User | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const isAuthenticated = computed(() => currentUser.value != null);
	const userId = computed(() => {
		console.log("🔍 userId computed - currentUser:", currentUser.value);
		console.log("🔍 userId computed - _id:", currentUser.value?._id);

		// If currentUser exists but no _id, try to get it from authToken
		if (currentUser.value && !currentUser.value._id) {
			const token = userStorage.getAuthToken();
			console.log("🔍 userId computed - no _id, trying token:", token);
			if (token) {
				return token;
			}
		}

		return currentUser.value?._id || null;
	});

	// Setup storage listener for cross-tab logout detection
	let cleanupStorageListener: (() => void) | null = null;

	async function login(username: string, password: string): Promise<void> {
		// Validate input before making API call
		const validation = validateUserLogin({ username, password });
		if (!validation.isValid) {
			error.value = formatValidationErrors(validation.errors);
			throw new Error(error.value);
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Login returns { user: ID, session: SESSION_TOKEN }
			const response = await userApi.login({ username, password });
			const userId = response.user;
			const sessionToken = response.session;

			// Fetch user details using the improved API
			const user = await userApi.getUserDetails(userId);

			// Ensure user has _id field
			if (!user._id) {
				user._id = userId;
			}

			currentUser.value = user;

			// Store session token (NOT user ID) and user data securely
			userStorage.setAuthToken(sessionToken);
			userStorage.setUser(user);

			// Setup cross-tab logout detection
			if (!cleanupStorageListener) {
				cleanupStorageListener = setupStorageListener(() => {
					logout();
				});
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Login failed. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function register(
		name: string,
		username: string,
		password: string,
	): Promise<void> {
		// Validate input before making API call
		const validation = validateUserRegistration({ name, username, password });
		if (!validation.isValid) {
			error.value = formatValidationErrors(validation.errors);
			throw new Error(error.value);
		}

		isLoading.value = true;
		error.value = null;

		try {
			// Register returns { user: ID }
			const response = await userApi.register({ name, username, password });
			const userId = response.user;

			// After registration, log in to get session token
			await login(username, password);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Registration failed. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function updateProfile(updates: {
		newName?: string;
		newUsername?: string;
		newPreferences?: Record<string, unknown>;
	}): Promise<void> {
		if (!currentUser.value) {
			throw new Error("No user logged in");
		}

		isLoading.value = true;
		error.value = null;

		try {
			await userApi.updateProfile({
				user: currentUser.value._id,
				...updates,
			});

			// Refresh user details using the improved API
			const user = await userApi.getUserDetails(currentUser.value._id);

			// Ensure user has _id field
			if (!user._id) {
				user._id = currentUser.value._id;
			}

			currentUser.value = user;

			// Update secure storage
			userStorage.setUser(user);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = getErrorMessage(err);
			} else {
				error.value = "Profile update failed. Please try again.";
			}
			throw err;
		} finally {
			isLoading.value = false;
		}
	}

	async function logout(): Promise<void> {
		const sessionToken = userStorage.getAuthToken();

		// Clear local state first
		currentUser.value = null;
		error.value = null;

		// Call backend to destroy session if we have a token
		if (sessionToken) {
			try {
				await userApi.logout(sessionToken);
			} catch (err) {
				console.error("Failed to destroy session on backend:", err);
				// Continue with local logout even if backend call fails
			}
		}

		// Clear storage
		userStorage.clearAuth();

		// Cleanup storage listener
		if (cleanupStorageListener) {
			cleanupStorageListener();
			cleanupStorageListener = null;
		}
	}

	function initializeAuth(): void {
		console.log("🔍 initializeAuth - starting");

		// Debug: Check what's actually in localStorage
		console.log(
			"🔍 initializeAuth - localStorage keys:",
			Object.keys(localStorage),
		);
		console.log(
			"🔍 initializeAuth - localStorage currentUser:",
			localStorage.getItem("currentUser"),
		);
		console.log(
			"🔍 initializeAuth - localStorage authToken:",
			localStorage.getItem("authToken"),
		);

		// Check for stored user on app initialization
		const storedUser = userStorage.getUser();
		const authToken = userStorage.getAuthToken();
		console.log("🔍 initializeAuth - storedUser:", storedUser);
		console.log("🔍 initializeAuth - authToken:", authToken);

		// Fallback to regular localStorage if secure storage fails
		let fallbackUser = null;
		let fallbackToken = null;

		if (!storedUser || !authToken) {
			console.log("🔍 initializeAuth - trying fallback localStorage");
			try {
				const fallbackUserData = localStorage.getItem("currentUser");
				const fallbackTokenData = localStorage.getItem("authToken");
				console.log("🔍 initializeAuth - fallback user:", fallbackUserData);
				console.log("🔍 initializeAuth - fallback token:", fallbackTokenData);

				if (fallbackUserData) {
					fallbackUser = JSON.parse(fallbackUserData);
				}
				fallbackToken = fallbackTokenData;
			} catch (error) {
				console.log("🔍 initializeAuth - fallback failed:", error);
			}
		}

		const finalUser = storedUser || fallbackUser;
		const finalToken = authToken || fallbackToken;

		if (finalUser && finalToken) {
			console.log("🔍 initializeAuth - setting currentUser:", finalUser);

			// Ensure the user object has _id field
			if (!finalUser._id && finalToken) {
				console.log(
					"🔍 initializeAuth - adding _id to user object:",
					finalToken,
				);
				finalUser._id = finalToken;
			}

			currentUser.value = finalUser;

			// Setup cross-tab logout detection
			if (!cleanupStorageListener) {
				cleanupStorageListener = setupStorageListener(() => {
					logout();
				});
			}
		} else {
			console.log("🔍 initializeAuth - no stored user or token found");
		}
	}

	function clearError(): void {
		error.value = null;
	}

	async function getUserDetails(userId: ID): Promise<User> {
		try {
			return await userApi.getUserDetails(userId);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to get user details.";
			}
			throw err;
		}
	}

	async function getUserIDByUsername(username: string): Promise<ID> {
		try {
			return await userApi.getUserIDByUsername(username);
		} catch (err) {
			if (err instanceof ApiError) {
				error.value = err.message;
			} else {
				error.value = "Failed to get user ID by username.";
			}
			throw err;
		}
	}

	// Debug method to manually refresh auth state
	function refreshAuthState(): void {
		console.log("🔍 refreshAuthState - manually refreshing");
		initializeAuth();
	}

	return {
		// State
		currentUser,
		isLoading,
		error,

		// Computed
		isAuthenticated,
		userId,

		// Actions
		login,
		register,
		updateProfile,
		logout,
		initializeAuth,
		getUserDetails,
		getUserIDByUsername,
		clearError,
		refreshAuthState, // Debug method
	};
});
