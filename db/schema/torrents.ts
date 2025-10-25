import { pgTable, text, integer, timestamp, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const torrent = pgTable("torrent", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  magnetLink: text("magnet_link").notNull(),
  infoHash: text("info_hash").unique(),
  size: integer("size"), // in bytes
  seeders: integer("seeders").default(0),
  leechers: integer("leechers").default(0),
  categoryId: text("category_id").references(() => category.id),
  posterUrl: text("poster_url"),
  addedByUserId: text("added_by_user_id").references(() => user.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => ({
  titleIndex: index("torrent_title_idx").on(table.title),
  infoHashIndex: index("torrent_info_hash_idx").on(table.infoHash),
  categoryIndex: index("torrent_category_idx").on(table.categoryId),
  createdAtIndex: index("torrent_created_at_idx").on(table.createdAt),
}));

export const torrentFile = pgTable("torrent_file", {
  id: text("id").primaryKey(),
  torrentId: text("torrent_id").notNull().references(() => torrent.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path"),
  size: integer("size").notNull(), // in bytes
  index: integer("index"), // file index in the torrent
  isVideo: boolean("is_video").default(false).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => ({
  torrentIndex: index("torrent_file_torrent_idx").on(table.torrentId),
  nameIndex: index("torrent_file_name_idx").on(table.name),
}));

export const torrentTracker = pgTable("torrent_tracker", {
  id: text("id").primaryKey(),
  torrentId: text("torrent_id").notNull().references(() => torrent.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => ({
  torrentUrlIndex: index("torrent_tracker_torrent_url_idx").on(table.torrentId, table.url),
}));

export const userTorrentActivity = pgTable("user_torrent_activity", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  torrentId: text("torrent_id").notNull().references(() => torrent.id, { onDelete: "cascade" }),
  activity: text("activity").notNull(), // 'viewed', 'downloaded', 'streamed'
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => ({
  userActivityIndex: index("user_torrent_activity_user_idx").on(table.userId),
  torrentActivityIndex: index("user_torrent_activity_torrent_idx").on(table.torrentId),
  userTorrentActivityIndex: index("user_torrent_activity_user_torrent_idx").on(table.userId, table.torrentId),
}));

// Types for TypeScript
export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;

export type Torrent = typeof torrent.$inferSelect;
export type NewTorrent = typeof torrent.$inferInsert;

export type TorrentFile = typeof torrentFile.$inferSelect;
export type NewTorrentFile = typeof torrentFile.$inferInsert;

export type TorrentTracker = typeof torrentTracker.$inferSelect;
export type NewTorrentTracker = typeof torrentTracker.$inferInsert;

export type UserTorrentActivity = typeof userTorrentActivity.$inferSelect;
export type NewUserTorrentActivity = typeof userTorrentActivity.$inferInsert;