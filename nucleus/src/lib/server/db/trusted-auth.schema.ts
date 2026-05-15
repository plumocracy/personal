import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const trustedAuthCode = pgTable(
	'trusted_auth_code',
	{
		id: text('id').primaryKey(),
		codeHash: text('code_hash').notNull().unique(),
		clientId: text('client_id').notNull(),
		redirectUri: text('redirect_uri').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at').notNull(),
		usedAt: timestamp('used_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('trusted_auth_code_clientId_idx').on(table.clientId),
		index('trusted_auth_code_userId_idx').on(table.userId),
		index('trusted_auth_code_expiresAt_idx').on(table.expiresAt)
	]
);
