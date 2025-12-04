import { mutation } from "./_generated/server";

// One-time migration to fix profiles with invalid userId values
export const fixInvalidUserIds = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    let fixedCount = 0;

    for (const profile of profiles) {
      if (profile.userId !== undefined) {
        // Try to verify if userId is a valid reference to a user
        const user = await ctx.db.get(profile.userId);
        if (!user) {
          // Invalid userId - set to undefined
          await ctx.db.patch(profile._id, { userId: undefined });
          fixedCount++;
        }
      }
    }

    return { fixedCount, totalProfiles: profiles.length };
  },
});

