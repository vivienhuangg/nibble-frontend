// Debug utilities for authentication issues
import { useAuthStore } from "@/stores/auth";

export function debugAuthState() {
	const authStore = useAuthStore();

	console.log("=== AUTH DEBUG INFO ===");
	console.log("isAuthenticated:", authStore.isAuthenticated);
	console.log("userId:", authStore.userId);
	console.log("currentUser:", authStore.currentUser);
	console.log("isLoading:", authStore.isLoading);
	console.log("error:", authStore.error);

	// Check localStorage directly
	console.log("=== LOCALSTORAGE DEBUG ===");
	console.log("localStorage keys:", Object.keys(localStorage));
	console.log(
		"currentUser from localStorage:",
		localStorage.getItem("currentUser"),
	);
	console.log(
		"authToken from localStorage:",
		localStorage.getItem("authToken"),
	);

	// Check if user has _id
	if (authStore.currentUser) {
		console.log("currentUser._id:", authStore.currentUser._id);
		console.log("currentUser keys:", Object.keys(authStore.currentUser));
	}

	console.log("=== END AUTH DEBUG ===");
}

// Function to manually refresh auth state
export function refreshAuth() {
	const authStore = useAuthStore();
	authStore.refreshAuthState();
	console.log("Auth state refreshed");
}

// Function to clear all auth data and start fresh
export function clearAuthData() {
	localStorage.removeItem("currentUser");
	localStorage.removeItem("authToken");
	console.log("All auth data cleared from localStorage");
}
