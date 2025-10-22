// Quick fix for missing _id field in current user
// Run this in the browser console to fix the current session

function fixCurrentUser() {
	// Get the auth store
	const authStore = useAuthStore();

	if (authStore.currentUser && !authStore.currentUser._id) {
		// Get the auth token (which should be the user ID)
		const token = localStorage.getItem("authToken");

		if (token) {
			console.log("🔧 Fixing currentUser - adding _id:", token);
			authStore.currentUser._id = token;

			// Update localStorage with the fixed user object
			localStorage.setItem(
				"currentUser",
				JSON.stringify(authStore.currentUser),
			);

			console.log(
				"✅ Fixed! currentUser now has _id:",
				authStore.currentUser._id,
			);
			console.log("✅ userId should now be:", authStore.userId);

			return true;
		} else {
			console.error("❌ No auth token found in localStorage");
			return false;
		}
	} else if (authStore.currentUser && authStore.currentUser._id) {
		console.log("✅ currentUser already has _id:", authStore.currentUser._id);
		return true;
	} else {
		console.error("❌ No currentUser found");
		return false;
	}
}

// Run the fix
fixCurrentUser();
