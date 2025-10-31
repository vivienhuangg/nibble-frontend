# Nibble Frontend

Visual Design Study: [https://docs.google.com/presentation/d/1m3s5Uy1LVZKXgfObPIyMWVeZDDuP2tOky7HccuWHDUM/edit?usp=sharing](https://docs.google.com/presentation/d/1m3s5Uy1LVZKXgfObPIyMWVeZDDuP2tOky7HccuWHDUM/edit?usp=sharing)

Screen Recording: [https://youtu.be/UlPPQgCI2RM](https://youtu.be/UlPPQgCI2RM)

## User Journey:

A user wants to start a shared cookbook with her roommates and improve a quick recipe using AI. She opens Nibble on her laptop, which loads into her Cookbooks view. In Nibble, every recipe must live inside a cookbook, so she first creates a new cookbook called **“Apartment Dinners.”** From this cookbook page, she clicks **“New Recipe,”** which opens a Notion-like editor where she can type the recipe directly. She enters the title **“Chicken Noodle Soup,”** leaves the description blank for now, and adds a minimal set of **Ingredients** (e.g., “1 cup broth,” “1 rotisserie chicken,” “1 cup mirepoix”) and a simple **Instruction** (“Throw all ingredients into a Dutch oven and cook for as long as you’d like.”). She also adds a **Note** (“The longer the better—more flavor gets extracted.”) and clicks **“Create.”** Nibble saves the recipe and returns her to the cookbook, showing the recipe with ingredients on the left and instructions on the right.

Feeling the recipe is too basic, she uses **“Improve with AI.”** She types a prompt like “Make this more complex and flavorful,” and after a short processing state the app presents a **diff view** of suggested edits. **Yellow** highlights indicate **modified** text, and **green** highlights indicate **newly added** steps or ingredients; an adjacent notes panel summarizes the LM’s reasoning. Satisfied, she clicks **“Accept & Apply,”** and Nibble updates the recipe with the enhanced description, steps, and ingredients.

Next, she wants her roommate to see the recipe immediately, so she opens the cookbook’s **Share** dialog, adds her roommate’s user (who already has an account), and confirms. After returning to the sidebar and refreshing, the cookbook appears under **Shared** for the roommate. The roommate can now open **Apartment Dinners → Chicken Noodle Soup** and view the finalized ingredients and instructions without needing edit access. The app confirms that sharing is active. The user feels **relief**, since she quickly created, improved, and shared a usable recipe without back-and-forth messaging.
