import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();

export const signIn = async (callbackURL = '/') => {
	await authClient.signIn.social({
		provider: 'github',
		callbackURL
	});
};

export const signOut = async () => {
	await authClient.signOut();
};
