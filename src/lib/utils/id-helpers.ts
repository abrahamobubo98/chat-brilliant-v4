import { Id } from "../../../convex/_generated/dataModel";

/**
 * Safely converts a string to a Convex ID for a specific table
 * @param id - The string ID to convert
 * @param tableName - The table this ID belongs to
 * @returns The converted ID or undefined if invalid
 */
export function asId<T extends keyof typeof TableNames>(
  id: string | undefined,
  tableName: T
): Id<T> | undefined {
  if (!id) return undefined;
  try {
    return id as unknown as Id<T>;
  } catch (e) {
    console.error(`Failed to convert string to ${tableName} ID:`, e);
    return undefined;
  }
}

// Table names enum to ensure type safety
export const TableNames = {
  workspaces: "workspaces",
  members: "members",
  channels: "channels",
  messages: "messages",
  conversations: "conversations",
  users: "users",
  reactions: "reactions",
  _storage: "_storage",
} as const; 