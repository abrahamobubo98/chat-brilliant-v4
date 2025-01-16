import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
 
        if (!userId) {
            return null;
        }

        // Query the users table by the auth subject (user ID)
        
        return await ctx.db.get(userId);
    }
})
