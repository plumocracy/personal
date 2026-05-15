import { pgTable, serial, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user, session, account } from './auth.schema';

export const posts = pgTable(
	'posts',
	{
		id: serial('id').primaryKey(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		summary: text('summary'),
		body: text('body').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		publishedAt: timestamp('published_at')
	},
	(table) => [index('posts_authorId_idx').on(table.authorId)]
);

export const postsRelations = relations(posts, ({ one }) => ({
	author: one(user, {
		fields: [posts.authorId],
		references: [user.id]
	})
}));

export const blogUserRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	posts: many(posts)
}));
