import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const offers = sqliteTable("offers", {
  id: text("id").primaryKey(),

  offerTitle: text("offer_title").notNull(),
  offerDescription: text("offer_description").notNull(),
  offerSalary: text("offer_salary").notNull(),
  offerContract: text("offer_contract").notNull(),
  offerEmail: text("offer_email").notNull(),

  rejected: integer("sent_email", { mode: "boolean" }).default(false).notNull(),
  rejectedReason: text("rejected_reason"),

  sentEmail: integer("sent_email", { mode: "boolean" }).default(false).notNull(),
  sentFailedReason: text("sent_failed_reason"),

  emailTo: text("email_to"),
  emailSubject: text("email_subject"),
  emailHtml: text("email_html"),
  emailLang: text("email_lang"),

  processed: integer("processed", { mode: "boolean" }).default(false).notNull(),
  processedDescription: text("processed_description"),
  processedTags: text("processed_tags"),

  createdAt: integer("timestamp", { mode: "timestamp" }).default(new Date()).notNull(),
});
