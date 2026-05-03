import type { Recipe } from '../../domain/entities/Recipe';
import type { RecipeFeedQuery, RecipeRepository } from '../../domain/repositories/RecipeRepository';

export class GetRecipeFeed {
  public constructor(private readonly recipeRepository: RecipeRepository) {}

  public async execute(query: RecipeFeedQuery): Promise<Recipe[]> {
    return this.recipeRepository.getFeed(query);
  }
}
