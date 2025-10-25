import { db } from '../db';
import { category, eq } from '../db';

async function seedCategories() {
  try {
    const categories = [
      { name: 'Movies', slug: 'movies', description: 'Full-length movies and films' },
      { name: 'TV Shows', slug: 'tv-shows', description: 'Television series and shows' },
      { name: 'Documentaries', slug: 'documentaries', description: 'Documentary films and series' },
      { name: 'Anime', slug: 'anime', description: 'Animated movies and series' },
      { name: 'Software', slug: 'software', description: 'Software applications and tools' },
      { name: 'Games', slug: 'games', description: 'Video games for various platforms' },
      { name: 'Music', slug: 'music', description: 'Music albums and tracks' },
      { name: 'Books', slug: 'books', description: 'E-books and audiobooks' },
      { name: 'Other', slug: 'other', description: 'Other content types' },
    ];

    console.log('Seeding categories...');

    for (const cat of categories) {
      const existingCategory = await db
        .select()
        .from(category)
        .where(eq(category.slug, cat.slug))
        .limit(1);

      if (existingCategory.length === 0) {
        await db.insert(category).values({
          id: crypto.randomUUID(),
          ...cat,
        });
        console.log(`✓ Created category: ${cat.name}`);
      } else {
        console.log(`- Category already exists: ${cat.name}`);
      }
    }

    console.log('Category seeding completed!');
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedCategories().then(() => process.exit(0));
}

export { seedCategories };