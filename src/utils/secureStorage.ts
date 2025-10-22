// Enhanced localStorage security utilities
import type { User } from "@/types/api";

// Simple encryption/decryption for localStorage (not production-grade, but better than plaintext)
const ENCRYPTION_KEY = "nibble-app-key-2024";

function simpleEncrypt(text: string): string {
	let result = "";
	for (let i = 0; i < text.length; i++) {
		const charCode =
			text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
		result += String.fromCharCode(charCode);
	}
	return btoa(result);
}

function simpleDecrypt(encryptedText: string): string {
	try {
		const text = atob(encryptedText);
		let result = "";
		for (let i = 0; i < text.length; i++) {
			const charCode =
				text.charCodeAt(i) ^
				ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
			result += String.fromCharCode(charCode);
		}
		return result;
	} catch {
		return "";
	}
}

// Secure storage interface
export interface SecureStorage {
	setItem(key: string, value: string): void;
	getItem(key: string): string | null;
	removeItem(key: string): void;
	clear(): void;
}

// Enhanced localStorage with encryption
export const secureStorage: SecureStorage = {
	setItem(key: string, value: string): void {
		try {
			const encrypted = simpleEncrypt(value);
			localStorage.setItem(key, encrypted);
		} catch (error) {
			console.warn("Failed to store encrypted data:", error);
			// Fallback to regular localStorage
			localStorage.setItem(key, value);
		}
	},

	getItem(key: string): string | null {
		try {
			const encrypted = localStorage.getItem(key);
			if (!encrypted) return null;

			const decrypted = simpleDecrypt(encrypted);
			return decrypted || null;
		} catch (error) {
			console.warn("Failed to decrypt data:", error);
			// Fallback to regular localStorage
			return localStorage.getItem(key);
		}
	},

	removeItem(key: string): void {
		localStorage.removeItem(key);
	},

	clear(): void {
		localStorage.clear();
	},
};

// User-specific storage functions
export const userStorage = {
	setUser(user: User): void {
		secureStorage.setItem("currentUser", JSON.stringify(user));
	},

	getUser(): User | null {
		try {
			const userData = secureStorage.getItem("currentUser");
			if (!userData) return null;
			return JSON.parse(userData) as User;
		} catch {
			return null;
		}
	},

	removeUser(): void {
		secureStorage.removeItem("currentUser");
	},

	setAuthToken(token: string): void {
		secureStorage.setItem("authToken", token);
	},

	getAuthToken(): string | null {
		return secureStorage.getItem("authToken");
	},

	removeAuthToken(): void {
		secureStorage.removeItem("authToken");
	},

	clearAuth(): void {
		userStorage.removeUser();
		userStorage.removeAuthToken();
	},
};

// Session storage for temporary data
export const sessionStorage = {
	setItem(key: string, value: string): void {
		try {
			window.sessionStorage.setItem(key, value);
		} catch (error) {
			console.warn("Failed to store session data:", error);
		}
	},

	getItem(key: string): string | null {
		try {
			return window.sessionStorage.getItem(key);
		} catch (error) {
			console.warn("Failed to get session data:", error);
			return null;
		}
	},

	removeItem(key: string): void {
		try {
			window.sessionStorage.removeItem(key);
		} catch (error) {
			console.warn("Failed to remove session data:", error);
		}
	},

	clear(): void {
		try {
			window.sessionStorage.clear();
		} catch (error) {
			console.warn("Failed to clear session data:", error);
		}
	},
};

// Token expiration utilities
export const tokenUtils = {
	isTokenExpired(_token: string): boolean {
		try {
			// Simple check - in a real app, you'd decode the JWT and check expiration
			// For now, we'll assume tokens don't expire (they're just user IDs)
			return false;
		} catch {
			return true;
		}
	},

	shouldRefreshToken(_token: string): boolean {
		// In a real app, you'd check if the token is close to expiring
		return false;
	},
};

// Auto-logout on storage events (detects logout in other tabs)
export function setupStorageListener(onLogout: () => void): () => void {
	const handleStorageChange = (event: StorageEvent) => {
		if (event.key === "authToken" && !event.newValue) {
			// Auth token was removed in another tab
			onLogout();
		}
	};

	window.addEventListener("storage", handleStorageChange);

	// Return cleanup function
	return () => {
		window.removeEventListener("storage", handleStorageChange);
	};
}
