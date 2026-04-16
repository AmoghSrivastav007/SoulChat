import { MeiliSearch } from "meilisearch";

const meili =
  process.env.MEILI_URL
    ? new MeiliSearch({
        host: process.env.MEILI_URL,
        apiKey: process.env.MEILI_MASTER_KEY
      })
    : null;

export type SearchableUser = { id: string; username: string; displayName: string };
export type SearchableMessage = { id: string; chatId: string; senderId: string; content: string; createdAt: string };

export async function indexUser(user: SearchableUser): Promise<void> {
  if (!meili) return;
  await meili.index("users").addDocuments([user]);
}

export async function indexMessage(message: SearchableMessage): Promise<void> {
  if (!meili) return;
  await meili.index("messages").addDocuments([message]);
}

export async function deleteMessageFromIndex(messageId: string): Promise<void> {
  if (!meili) return;
  await meili.index("messages").deleteDocument(messageId);
}

export async function searchUsers(query: string): Promise<SearchableUser[]> {
  if (!meili) return [];
  const result = await meili.index("users").search<SearchableUser>(query, { limit: 20 });
  return result.hits;
}

export async function searchMessages(
  query: string,
  chatId?: string
): Promise<SearchableMessage[]> {
  if (!meili) return [];
  const filter = chatId ? `chatId = "${chatId}"` : undefined;
  const result = await meili
    .index("messages")
    .search<SearchableMessage>(query, { limit: 30, filter });
  return result.hits;
}

export async function ensureIndexes(): Promise<void> {
  if (!meili) return;
  try {
    await meili.createIndex("users", { primaryKey: "id" });
    await meili.createIndex("messages", { primaryKey: "id" });
    await meili.index("messages").updateFilterableAttributes(["chatId", "senderId"]);
    await meili.index("users").updateSearchableAttributes(["username", "displayName"]);
    await meili.index("messages").updateSearchableAttributes(["content"]);
  } catch {
    // indexes may already exist
  }
}
