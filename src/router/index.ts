import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "home",
			component: () => import("../views/CookbooksLandingView.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/auth",
			name: "auth",
			component: () => import("../views/AuthView.vue"),
			meta: { requiresGuest: true },
		},
	{
		path: "/recipes",
		name: "recipes",
		component: () => import("../views/RecipesView.vue"),
		meta: { requiresAuth: true },
	},
	{
		path: "/recipes/create",
		name: "create-recipe",
		component: () => import("../views/CreateRecipeView.vue"),
		meta: { requiresAuth: true },
	},
	{
		path: "/recipe/:id",
		name: "recipe-detail",
		component: () => import("../views/RecipeDetailView.vue"),
		meta: { requiresAuth: true },
	},
		{
			path: "/cookbooks",
			name: "cookbooks",
			component: () => import("../views/CookbooksLandingView.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/cookbooks/:id",
			name: "cookbook",
			component: () => import("../views/CookbookView.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/about",
			name: "about",
			component: () => import("../views/AboutView.vue"),
		},
	],
});

// Navigation guards
router.beforeEach((to, _from, next) => {
	const authStore = useAuthStore();

	console.log(
		"🔍 Router guard - to:",
		to.path,
		"isAuthenticated:",
		authStore.isAuthenticated,
		"currentUser:",
		authStore.currentUser,
	);

	if (to.meta.requiresAuth && !authStore.isAuthenticated) {
		console.log("🔍 Router guard - redirecting to auth (requires auth)");
		next("/auth");
	} else if (to.meta.requiresGuest && authStore.isAuthenticated) {
		console.log(
			"🔍 Router guard - redirecting to home (authenticated user on guest page)",
		);
		next("/");
	} else {
		console.log("🔍 Router guard - allowing navigation");
		next();
	}
});

export default router;
