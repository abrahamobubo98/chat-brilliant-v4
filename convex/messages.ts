import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { mutation, query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const populateThread = async (ctx: QueryCtx, messageId: Id<"messages">) => {
    const messages = await ctx.db
    .query("messages")
    .withIndex("by_parent_message_id", (q) => 
        q.eq("parentMessageId", messageId)
    )
    .collect();

    if (messages.length === 0) {
        return {
            count: 0,
            image: undefined,
            timestamp: 0
        };
    }

    const lastMessage = messages[messages.length - 1];
    const lastMessageMember = await populateMember(ctx, lastMessage.memberId);

    if (!lastMessageMember) {
        return {
            count: 0,
            image: undefined,
            timestamp: 0
        };
    };

    const lastMessageUser = await populateUser(ctx, lastMessageMember.userId);

    return {
        count: messages.length,
        image: lastMessageUser?.image,
        timestamp: lastMessage._creationTime
    };

};

const populateReactions = async (ctx: QueryCtx, messageId: Id<"messages">) => {
    return await ctx.db
        .query("reactions")
        .withIndex("by_message_id", (q) => q.eq("messageId", messageId))
        .collect();
};

const populateUser = (ctx: QueryCtx, userId: Id<"users">) => {
    return ctx.db.get(userId);
};

const populateMember = async (ctx: QueryCtx, memberId: Id<"members">) => {
    return await ctx.db
        .get(memberId);
};

const getMember = async (
    ctx: QueryCtx, 
    workspaceId: Id<"workspaces">, 
    userId: Id<"users">
) => {
    return await ctx.db
        .query("members")
        .withIndex("by_workspace_id_user_id", (q) => 
            q.eq("workspaceId", workspaceId).eq("userId", userId)
        )
        .unique();
};

export const get = query({
    args: {
       channelId: v.optional(v.id("channels")),
       conversationId: v.optional(v.id("conversations")),
       parentMessageId: v.optional(v.id("messages")),
       paginationOpts: paginationOptsValidator
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        };

        let _conversationId = args.conversationId;

        if (!args.conversationId && args.channelId && args.parentMessageId && args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId);

            if (!parentMessage) {
                throw new Error("Parent message not found");
            };

            _conversationId = parentMessage.conversationId;
        };

        const results = await ctx.db
            .query("messages")
            .withIndex("by_channel_id_parent_message_id_conversation_id", (q) => 
                q
                .eq("channelId", args.channelId)
                .eq("parentMessageId", args.parentMessageId)
                .eq("conversationId", _conversationId)
            )
            .order("desc")
            .paginate(args.paginationOpts);

        return results;

    }
});

export const create = mutation({
    args: {
        body: v.string(),
        image: v.optional(v.id("_storage")),
        workspaceId: v.id("workspaces"),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        parentMessageId: v.optional(v.id("messages")),
    },
    handler: async (ctx,args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        };

        const memberId = await getMember(ctx, args.workspaceId, userId);

        if (!memberId) {
            throw new Error("Unauthorized");
        };

        let _conversationId: Id<"conversations"> | undefined;

        //Only possible if the message is a reply to a message in a one-on-one conversation
        if (!args.conversationId && args.channelId && args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId);

            if (!parentMessage) {
                throw new Error("Parent message not found");
            };

            _conversationId = parentMessage.conversationId;
            
        };

        const messageId = await ctx.db.insert("messages", {
            memberId: memberId._id,
            body: args.body,
            image: args.image,
            channelId: args.channelId,
            conversationId: _conversationId,
            workspaceId: args.workspaceId,
            parentMessageId: args.parentMessageId,
            updatedAt: Date.now(),
        });

        return messageId;
    }
})