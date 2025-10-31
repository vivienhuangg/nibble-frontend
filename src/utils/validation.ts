// Client-side validation utilities
import type {
	Ingredient,
	RecipeCreate,
	RecipeUpdate,
	Step,
	UserLogin,
	UserRegistration,
} from "@/types/api";

export interface ValidationError {
	field: string;
	message: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

// Generic validation functions
export function validateRequired(
	value: unknown,
	fieldName: string,
): ValidationError | null {
	if (!value || (typeof value === "string" && value.trim() === "")) {
		return {
			field: fieldName,
			message: `${fieldName} is required`,
		};
	}
	return null;
}

export function validateEmail(email: string): ValidationError | null {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return {
			field: "email",
			message: "Please enter a valid email address",
		};
	}
	return null;
}

export function validatePassword(password: string): ValidationError | null {
	// No minimum length requirement
	return null;
}

export function validateMinLength(
	value: string,
	minLength: number,
	fieldName: string,
): ValidationError | null {
	// Minimum length validation removed - no restrictions
	return null;
}

export function validateMaxLength(
	value: string,
	maxLength: number,
	fieldName: string,
): ValidationError | null {
	if (value.length > maxLength) {
		return {
			field: fieldName,
			message: `${fieldName} must be no more than ${maxLength} characters long`,
		};
	}
	return null;
}

// Specific validation functions
export function validateUserRegistration(
	data: UserRegistration,
): ValidationResult {
	const errors: ValidationError[] = [];

	// Validate name
	const nameError = validateRequired(data.name, "Name");
	if (nameError) errors.push(nameError);
	else {
		const nameLengthError = validateMinLength(data.name, 2, "Name");
		if (nameLengthError) errors.push(nameLengthError);
		const nameMaxError = validateMaxLength(data.name, 100, "Name");
		if (nameMaxError) errors.push(nameMaxError);
	}

	// Validate username
	const usernameRequiredError = validateRequired(data.username, "Username");
	if (usernameRequiredError) errors.push(usernameRequiredError);
	else {
		const usernameLengthError = validateMinLength(data.username, 3, "Username");
		if (usernameLengthError) errors.push(usernameLengthError);
		const usernameMaxError = validateMaxLength(data.username, 50, "Username");
		if (usernameMaxError) errors.push(usernameMaxError);
	}

	// Validate password
	const passwordError = validatePassword(data.password);
	if (passwordError) errors.push(passwordError);

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function validateUserLogin(data: UserLogin): ValidationResult {
	const errors: ValidationError[] = [];

	const usernameRequiredError = validateRequired(data.username, "Username");
	if (usernameRequiredError) errors.push(usernameRequiredError);

	const passwordRequiredError = validateRequired(data.password, "Password");
	if (passwordRequiredError) errors.push(passwordRequiredError);

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function validateIngredient(ingredient: Ingredient): ValidationResult {
	const errors: ValidationError[] = [];

	const nameError = validateRequired(ingredient.name, "Ingredient name");
	if (nameError) errors.push(nameError);
	else {
		const nameLengthError = validateMaxLength(
			ingredient.name,
			200,
			"Ingredient name",
		);
		if (nameLengthError) errors.push(nameLengthError);
	}

	const quantityError = validateRequired(ingredient.quantity, "Quantity");
	if (quantityError) errors.push(quantityError);
	else {
		const quantityLengthError = validateMaxLength(
			ingredient.quantity,
			50,
			"Quantity",
		);
		if (quantityLengthError) errors.push(quantityLengthError);
	}

	if (ingredient.unit) {
		const unitLengthError = validateMaxLength(ingredient.unit, 20, "Unit");
		if (unitLengthError) errors.push(unitLengthError);
	}

	if (ingredient.notes) {
		const notesLengthError = validateMaxLength(ingredient.notes, 500, "Notes");
		if (notesLengthError) errors.push(notesLengthError);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function validateStep(step: Step): ValidationResult {
	const errors: ValidationError[] = [];

	const descriptionError = validateRequired(
		step.description,
		"Step description",
	);
	if (descriptionError) errors.push(descriptionError);
	else {
		const descriptionLengthError = validateMinLength(
			step.description,
			10,
			"Step description",
		);
		if (descriptionLengthError) errors.push(descriptionLengthError);
		const descriptionMaxError = validateMaxLength(
			step.description,
			1000,
			"Step description",
		);
		if (descriptionMaxError) errors.push(descriptionMaxError);
	}

	if (step.duration !== undefined && step.duration < 0) {
		errors.push({
			field: "duration",
			message: "Duration must be a positive number",
		});
	}

	if (step.notes) {
		const notesLengthError = validateMaxLength(step.notes, 500, "Notes");
		if (notesLengthError) errors.push(notesLengthError);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function validateRecipeCreate(data: RecipeCreate): ValidationResult {
	const errors: ValidationError[] = [];

	// Validate title
	const titleError = validateRequired(data.title, "Recipe title");
	if (titleError) errors.push(titleError);
	else {
		const titleLengthError = validateMinLength(data.title, 3, "Recipe title");
		if (titleLengthError) errors.push(titleLengthError);
		const titleMaxError = validateMaxLength(data.title, 200, "Recipe title");
		if (titleMaxError) errors.push(titleMaxError);
	}

	// Validate description
	if (data.description) {
		const descriptionLengthError = validateMaxLength(
			data.description,
			1000,
			"Description",
		);
		if (descriptionLengthError) errors.push(descriptionLengthError);
	}

	// Validate ingredients
	if (!data.ingredients || data.ingredients.length === 0) {
		errors.push({
			field: "ingredients",
			message: "Recipe must have at least one ingredient",
		});
	} else {
		data.ingredients.forEach((ingredient, index) => {
			const ingredientValidation = validateIngredient(ingredient);
			ingredientValidation.errors.forEach((error) => {
				errors.push({
					field: `ingredients[${index}].${error.field}`,
					message: error.message,
				});
			});
		});
	}

	// Validate steps
	if (!data.steps || data.steps.length === 0) {
		errors.push({
			field: "steps",
			message: "Recipe must have at least one step",
		});
	} else {
		data.steps.forEach((step, index) => {
			const stepValidation = validateStep(step);
			stepValidation.errors.forEach((error) => {
				errors.push({
					field: `steps[${index}].${error.field}`,
					message: error.message,
				});
			});
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function validateRecipeUpdate(data: RecipeUpdate): ValidationResult {
	const errors: ValidationError[] = [];

	// Validate title if provided
	if (data.newTitle !== undefined) {
		const titleError = validateRequired(data.newTitle, "Recipe title");
		if (titleError) errors.push(titleError);
		else {
			const titleLengthError = validateMinLength(
				data.newTitle,
				3,
				"Recipe title",
			);
			if (titleLengthError) errors.push(titleLengthError);
			const titleMaxError = validateMaxLength(
				data.newTitle,
				200,
				"Recipe title",
			);
			if (titleMaxError) errors.push(titleMaxError);
		}
	}

	// Validate description if provided
	if (data.newDescription !== undefined && data.newDescription) {
		const descriptionLengthError = validateMaxLength(
			data.newDescription,
			1000,
			"Description",
		);
		if (descriptionLengthError) errors.push(descriptionLengthError);
	}

	// Validate ingredients if provided
	if (data.newIngredients !== undefined) {
		if (data.newIngredients.length === 0) {
			errors.push({
				field: "ingredients",
				message: "Recipe must have at least one ingredient",
			});
		} else {
			data.newIngredients.forEach((ingredient, index) => {
				const ingredientValidation = validateIngredient(ingredient);
				ingredientValidation.errors.forEach((error) => {
					errors.push({
						field: `ingredients[${index}].${error.field}`,
						message: error.message,
					});
				});
			});
		}
	}

	// Validate steps if provided
	if (data.newSteps !== undefined) {
		if (data.newSteps.length === 0) {
			errors.push({
				field: "steps",
				message: "Recipe must have at least one step",
			});
		} else {
			data.newSteps.forEach((step, index) => {
				const stepValidation = validateStep(step);
				stepValidation.errors.forEach((error) => {
					errors.push({
						field: `steps[${index}].${error.field}`,
						message: error.message,
					});
				});
			});
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

// Utility function to format validation errors for display
export function formatValidationErrors(errors: ValidationError[]): string {
	return errors.map((error) => `${error.field}: ${error.message}`).join(", ");
}
