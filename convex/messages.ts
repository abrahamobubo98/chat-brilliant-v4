import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { mutation, query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

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
            timestamp: 0,
            name: "",
        };
    }

    const lastMessage = messages[messages.length - 1];
    const lastMessageMember = await populateMember(ctx, lastMessage.memberId);

    if (!lastMessageMember) {
        return {
            count: 0,
            image: undefined,
            timestamp: 0,
            name: "",
        };
    };

    const lastMessageUser = await populateUser(ctx, lastMessageMember.userId);

    return {
        count: messages.length,
        image: lastMessageUser?.image,
        timestamp: lastMessage._creationTime,
        name: lastMessageUser?.name,
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

export const remove = mutation({
    args: {
        id: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        };

        const message = await ctx.db.get(args.id);

        if (!message) {
            throw new Error("Message not found");
        };

        const member = await getMember(ctx, message.workspaceId, userId);

        if (!member || member._id !== message.memberId) {
            throw new Error("Unauthorized");
        };

        // Delete the message from the vector database
        await ctx.scheduler.runAfter(0, api.vector.deleteMessageVector, {
            messageId: args.id,
        });

        await ctx.db.delete(args.id);
        
        return args.id;
    }
})

export const update = mutation({
    args: {
        id: v.id("messages"),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        };

        const { id, body } = args;

        const message = await ctx.db.get(id);

        if (!message) {
            throw new Error("Message not found");
        };

        const member = await getMember(ctx, message.workspaceId, userId);

        if (!member || member._id !== message.memberId) {
            throw new Error("Unauthorized");
        };

        await ctx.db.patch(id, {
            body,
            updatedAt: Date.now(),
        });

        // Update the message content in the vector database
        await ctx.scheduler.runAfter(0, api.vector.updateMessageVector, {
            messageId: id,
            newText: body,
        });

        return id;
    }
})

export const getById = query({
    args: {
        id: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            return null;
        };

        const message = await ctx.db.get(args.id);

        if (!message) {
            return null;
        };

        const currentMember = await getMember(ctx, message.workspaceId, userId);

        if (!currentMember) {
            return null;
        };

        const member = await populateMember(ctx, message.memberId);

        if (!member) {
            return null;
        };

        const user = await populateUser(ctx, member.userId);

        if (!user) {
            return null;
        };

        const reactions = await populateReactions(ctx, message._id);

        const reactionsWithCounts = reactions.map((reaction) => {
            return {
                ...reaction,
                count: reactions.filter((r) => r.value === reaction.value).length,
            };
        });

        const dedupedReactions = reactionsWithCounts.reduce(
            (acc, reaction) => {
                const existingReaction = acc.find(
                    (r) => r.value === reaction.value,
                );

                if (existingReaction) {
                    existingReaction.memberIds = Array.from(
                        new Set([...existingReaction.memberIds, reaction.memberId])
                    );
                } else {
                    acc.push({
                        ...reaction,
                        memberIds: [reaction.memberId],
                    });
                }

                return acc;
            },
            [] as (Doc<"reactions"> & {
                count: number;
                memberIds: Id<"members">[];
            })[]

        );

        const reactionsWithoutMemberIdProperty = dedupedReactions.map(
            ({memberId, ...rest }) => rest,
        );

        return {
            ...message,
            reactions: reactionsWithoutMemberIdProperty,
            user,
            member,
            image: message.image ? await ctx.storage.getUrl(message.image) : undefined,
            isAIGenerated: message.isAIGenerated || false
        };
    }
})

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

        if (!args.conversationId && args.channelId && args.parentMessageId) {
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

        return {
            ...results,
            page: (
                await Promise.all(
                    results.page.map(async (message) => {
                        const member = await populateMember(ctx, message.memberId);
                        const user = member ? await  populateUser(ctx, member.userId) : null;

                        if (!member || !user) {
                            return null;
                        };

                        const reactions = await populateReactions(ctx, message._id);
                        const thread = await populateThread(ctx, message._id);
                        const image =  message.image
                            ? await ctx.storage.getUrl(message.image)
                            : undefined;

                        const reactionsWithCounts = reactions.map((reaction) => {
                            return {
                                ...reaction,
                                count: reactions.filter((r) => r.value === reaction.value).length,
                            };
                        });

                        const dedupedReactions = reactionsWithCounts.reduce(
                            (acc, reaction) => {
                                const existingReaction = acc.find(
                                    (r) => r.value === reaction.value,
                                );

                                if (existingReaction) {
                                    existingReaction.memberIds = Array.from(
                                        new Set([...existingReaction.memberIds, reaction.memberId])
                                    );
                                } else {
                                    acc.push({
                                        ...reaction,
                                        memberIds: [reaction.memberId],
                                    });
                                }

                                return acc;
                            },
                            [] as (Doc<"reactions"> & {
                                count: number;
                                memberIds: Id<"members">[];
                            })[]

                        );

                        const reactionsWithoutMemberIdProperty = dedupedReactions.map(
                            ({memberId, ...rest }) => rest,
                        );

                        return {
                            ...message,
                            image,
                            member,
                            user,
                            reactions: reactionsWithoutMemberIdProperty,
                            threadCount: thread.count,
                            threadImage: thread.image,
                            threadName: thread.name,
                            threadTimestamp: thread.timestamp,
                            isAIGenerated: message.isAIGenerated || false
                        };
                    })
                )
            ).filter(
                (message): message is NonNullable<typeof message> => message !== null
            )
        };
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

        let _conversationId = args.conversationId;

        //Only possible if the message is a reply to a message in a one-on-one conversation
        if (!args.conversationId && args.channelId && args.parentMessageId) {
            const parentMessage = await ctx.db.get(args.parentMessageId);

            if (!parentMessage) {
                throw new Error("Parent message not found");
            };

            _conversationId = parentMessage.conversationId;
            
        };

        // Create the message
        const messageId = await ctx.db.insert("messages", {
            memberId: memberId._id,
            body: args.body,
            image: args.image,
            channelId: args.channelId,
            conversationId: _conversationId,
            workspaceId: args.workspaceId,
            parentMessageId: args.parentMessageId,
        });

        // Check if we need to trigger AI avatar responses
        // Only for direct messages in conversations (not channels)
        if (_conversationId && !args.channelId) {
            try {
                // Get the conversation to find the other member
                const conversation = await ctx.db.get(_conversationId);
                
                if (conversation) {
                    // Find the other member in the conversation
                    const otherMemberId = conversation.memberOneId === memberId._id 
                        ? conversation.memberTwoId 
                        : conversation.memberOneId;
                    
                    // Get the other member to check if they're online
                    const otherMember = await ctx.db.get(otherMemberId);
                    
                    if (otherMember && otherMember.userId) {
                        // Check if they're offline
                        const isOffline = !otherMember.isOnline;
                        
                        // Log for debugging
                        console.log(`[MESSAGES:SEND] Message received: ${args.body.substring(0, 50)}...`);
                        console.log(`[MESSAGES:SEND] Recipient member ${otherMemberId} is offline: ${isOffline}`);
                        
                        if (isOffline) {
                            // Check if they have an active avatar
                            console.log(`[MESSAGES:SEND] Checking if recipient ${otherMember.userId} has active avatar`);
                            const isAvatarActive = await ctx.runQuery(api.avatar.isAvatarActive, {
                                userId: otherMember.userId
                            });
                            
                            console.log(`[MESSAGES:SEND] Recipient avatar active: ${isAvatarActive}`);
                            
                            if (isAvatarActive) {
                                console.log(`[MESSAGES:SEND] Recipient has active avatar. Triggering automated response.`);
                                try {
                                    // Trigger the avatar to respond with a delay to make it feel natural
                                    ctx.scheduler.runAfter(3000, api.avatar.processDelayedResponse, {
                                        userId: otherMember.userId,
                                        messageText: args.body,
                                        conversationId: _conversationId,
                                        workspaceId: args.workspaceId,
                                        receiverMemberId: otherMemberId
                                    });
                                    
                                    console.log(`[MESSAGES:SEND] Avatar response scheduled`);
                                } catch (avatarError) {
                                    console.error(`[MESSAGES:SEND] Error scheduling avatar response: ${avatarError}`);
                                    // Don't fail the message send if avatar response fails
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                // Log error but don't prevent message creation
                console.error("Error checking for avatar response:", error);
            }
        }

        return messageId;
    }
})

export const send = mutation({
    args: {
        body: v.string(),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("conversations")),
        workspaceId: v.id("workspaces"),
        parentMessageId: v.optional(v.id("messages")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        };

        const { body, channelId, conversationId, workspaceId, parentMessageId } = args;

        if (!channelId && !conversationId) {
            throw new Error("Either channelId or conversationId is required");
        };

        const member = await getMember(ctx, workspaceId, userId);

        if (!member) {
            throw new Error("Member not found");
        };

        // Create the message
        const messageId = await ctx.db.insert("messages", {
            body,
            memberId: member._id,
            workspaceId,
            channelId,
            conversationId,
            parentMessageId,
        });

        // Store the message content in the vector database for semantic search
        await ctx.scheduler.runAfter(0, api.vector.storeMessageVector, {
            messageId,
            text: body,
            workspaceId,
            userId,
        });

        return messageId;
    },
});

// Add a semantic search function for messages
export const semanticSearch = query({
    args: {
        query: v.string(),
        workspaceId: v.id("workspaces"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Unauthorized");
        };

        const { query, workspaceId, limit = 5 } = args;

        const member = await getMember(ctx, workspaceId, userId);

        if (!member) {
            throw new Error("Unauthorized");
        };

        // Call the vector search action to find similar messages
        // This is a mock implementation - the real implementation will call the vector database
        // This will be replaced by an action in a production application
        
        // Example of how to structure the response for now
        return {
            query,
            results: [],
            count: 0
        };
    },
});

// Function for sending AI-generated messages - used by the avatar module
export const sendAIMessage = mutation({
    args: {
        body: v.string(),
        memberId: v.id("members"),
        workspaceId: v.id("workspaces"),
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const { body, memberId, workspaceId, conversationId } = args;
        
        console.log(`[MESSAGES:SEND_AI] Received request to send AI message.
          body: ${body.substring(0, 50)}...
          memberId: ${memberId}
          workspaceId: ${workspaceId}
          conversationId: ${conversationId}
        `);
        
        // Validate the body format
        try {
            // Ensure the body is valid JSON with a proper Quill Delta structure
            const parsedBody = JSON.parse(body);
            if (!parsedBody.ops || !Array.isArray(parsedBody.ops)) {
                console.error(`[MESSAGES:SEND_AI] Invalid message format: Missing or invalid 'ops' array`);
                // Try to fix it by wrapping it in a proper structure
                const fixedBody = JSON.stringify({
                    ops: [{ insert: typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody) }]
                });
                console.log(`[MESSAGES:SEND_AI] Attempted to fix message format. New body: ${fixedBody.substring(0, 50)}...`);
                args.body = fixedBody;
            } else {
                console.log(`[MESSAGES:SEND_AI] Message has valid Quill Delta format with ${parsedBody.ops.length} operations`);
            }
        } catch (parseError) {
            console.error(`[MESSAGES:SEND_AI] Error parsing message body as JSON: ${parseError}`);
            // Not valid JSON, wrap it as plain text
            const fixedBody = JSON.stringify({
                ops: [{ insert: body }]
            });
            console.log(`[MESSAGES:SEND_AI] Fixed non-JSON message. New body: ${fixedBody.substring(0, 50)}...`);
            args.body = fixedBody;
        }
        
        try {
            // Create the message with a special flag indicating it's AI-generated
            console.log(`[MESSAGES:SEND_AI] Inserting message into database with isAIGenerated=true`);
            const messageId = await ctx.db.insert("messages", {
                body: args.body,
                memberId,
                workspaceId,
                conversationId,
                isAIGenerated: true, // Add this flag to identify AI-generated messages
            });
            console.log(`[MESSAGES:SEND_AI] Successfully created message. ID: ${messageId}`);
            
            // Get member info to pass the proper user ID
            console.log(`[MESSAGES:SEND_AI] Getting member info for ${memberId}`);
            const member = await ctx.db.get(memberId);
            if (!member) {
                console.error(`[MESSAGES:SEND_AI] Member not found: ${memberId}`);
                throw new Error("Member not found");
            }
            console.log(`[MESSAGES:SEND_AI] Found member. User ID: ${member.userId}`);
            
            try {
                // Store the message in vector DB for future context
                console.log(`[MESSAGES:SEND_AI] Storing message in vector database`);
                await ctx.scheduler.runAfter(0, api.vector.storeMessageVector, {
                    messageId,
                    text: args.body,
                    workspaceId,
                    userId: member.userId
                });
                console.log(`[MESSAGES:SEND_AI] Successfully scheduled vector storage`);
            } catch (vectorError) {
                // Log but don't fail if vector storage fails
                console.error(`[MESSAGES:SEND_AI] Vector storage error (non-fatal): ${vectorError}`);
            }
            
            return messageId;
        } catch (error) {
            console.error(`[MESSAGES:SEND_AI] Error sending AI message: ${error}`);
            throw error;
        }
    },
});