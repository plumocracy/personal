import { db } from './db';
import { admin } from './db/auth.schema';
import { eq } from 'drizzle-orm';

export async function isUserAdmin(user): Promise<boolean> {
	if (!user) {
		return false;
	}

	// This variable name is false because we actually get back and admin object
	// if one exists, but we can think of it as a boolean in context.
	const [isAdmin] = await db.select().from(admin).where(eq(user.id, admin.userId)).limit(1);

	if (isAdmin) {
		return true;
	}
	return false;
}
