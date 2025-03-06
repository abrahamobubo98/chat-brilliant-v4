import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server"; 
import { Doc, Id } from "./_generated/dataModel";

export const createOrGet = mutation({
    args: {
        memberId: v.id("members"),
        workspaceId: v.id("workspaces"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        }

        const currentMember = await ctx.db
            .query("members")
            .withIndex("by_workspace_id_user_id", (q) => 
                q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique();

        const otherMember = await ctx.db.get(args.memberId);

        if (!currentMember || !otherMember) {
            throw new Error("Member not found");
        }

        const existingConversation = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
            .filter((q) => 
                q.or(
                    q.and(
                        q.eq(q.field("memberOneId"), currentMember._id),
                        q.eq(q.field("memberTwoId"), otherMember._id)
                    ),
                    q.and(
                        q.eq(q.field("memberOneId"), otherMember._id),
                        q.eq(q.field("memberTwoId"), currentMember._id)
                    )
                )
            )
            .unique();

        if (existingConversation) {
            return existingConversation._id;
        }

        const conversationId = await ctx.db.insert("conversations", {
            workspaceId: args.workspaceId,
            memberOneId: currentMember._id,
            memberTwoId: otherMember._id,
        });

        return conversationId;
    }
});

interface ConversationWithDetails {
    id: Id<"conversations">;
    otherMember: {
        id: Id<"members">;
        name: string;
        image: string | null;
    };
    lastMessage: {
        body: string;
        createdAt: number;
        isUnread: boolean;
    } | null;
}

export const list = query({
    args: {
        workspaceId: v.id("workspaces"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        }

        const currentMember = await ctx.db
            .query("members")
            .withIndex("by_workspace_id_user_id", (q) => 
                q.eq("workspaceId", args.workspaceId).eq("userId", userId))
            .unique();

        if (!currentMember) {
            throw new Error("Member not found");
        }

        // Find all conversations where current member is either memberOne or memberTwo
        const conversations = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
            .filter((q) => 
                q.or(
                    q.eq(q.field("memberOneId"), currentMember._id),
                    q.eq(q.field("memberTwoId"), currentMember._id)
                )
            )
            .collect();

        // For each conversation, get the other member's details and the last message
        const results = [];
        
        for (const conversation of conversations) {
            // Determine which member is the other person
            const otherMemberId = 
                conversation.memberOneId === currentMember._id 
                    ? conversation.memberTwoId 
                    : conversation.memberOneId;
            
            // Get the other member's details
            const otherMember = await ctx.db.get(otherMemberId);
            
            if (!otherMember) {
                continue;
            }
            
            // Get the other member's user details
            const otherUser = await ctx.db
                .get(otherMember.userId);
            
            if (!otherUser) {
                continue;
            }
            
            // Get the last message in this conversation
            const lastMessages = await ctx.db
                .query("messages")
                .withIndex("by_conversation_id", (q) => 
                    q.eq("conversationId", conversation._id)
                )
                .order("desc")
                .take(1);
            
            const lastMessage = lastMessages.length > 0 ? lastMessages[0] : null;
            
            // Calculate if there are unread messages (where the memberId is not the current user)
            const unreadMessages = lastMessage && lastMessage.memberId !== currentMember._id;
            
            results.push({
                id: conversation._id,
                otherMember: {
                    id: otherMember._id,
                    name: otherUser.name || "",
                    image: otherUser.image || "",
                },
                lastMessage: lastMessage 
                    ? { 
                        body: lastMessage.body,
                        createdAt: lastMessage._creationTime,
                        isUnread: unreadMessages || false
                      } 
                    : null
            });
        }
        
        // Sort by last message time (most recent first)
        return results.sort((a, b) => {
            // If either conversation doesn't have messages, sort it at the end
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            
            return b.lastMessage.createdAt - a.lastMessage.createdAt;
        });
    }
});