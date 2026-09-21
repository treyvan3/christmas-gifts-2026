import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
export const gifts=sqliteTable('gifts',{
 id:text('id').primaryKey(), userId:text('user_id').notNull(),groupId:text('group_id').notNull(),name:text('name').notNull(),recipient:text('recipient').notNull(),query:text('query').notNull().default(''),url:text('url').notNull().default(''),status:text('status').notNull().default('watching'),plannedPrice:real('planned_price'),selectedOfferId:text('selected_offer_id'),threshold:integer('threshold').notNull().default(15),offers:text('offers').notNull().default('[]'),currentPrice:real('current_price'),currency:text('currency').notNull().default('USD'),lastChecked:text('last_checked'),lastSuccess:text('last_success'),error:text('error'),createdAt:text('created_at').notNull()
},t=>[index('idx_gifts_user').on(t.userId),index('idx_gifts_due').on(t.status,t.lastChecked)]);
export const observations=sqliteTable('observations',{id:text('id').primaryKey(),giftId:text('gift_id').notNull().references(()=>gifts.id,{onDelete:'cascade'}),offerId:text('offer_id').notNull(),price:real('price').notNull(),currency:text('currency').notNull(),seller:text('seller').notNull(),checkedAt:text('checked_at').notNull()},t=>[index('idx_observations_gift_time').on(t.giftId,t.checkedAt)]);
export const alerts=sqliteTable('alerts',{id:text('id').primaryKey(),userId:text('user_id').notNull(),giftId:text('gift_id').notNull().references(()=>gifts.id,{onDelete:'cascade'}),message:text('message').notNull(),createdAt:text('created_at').notNull(),seen:integer('seen').notNull().default(0)},t=>[index('idx_alerts_user_time').on(t.userId,t.createdAt)]);
export const system=sqliteTable('system',{key:text('key').primaryKey(),value:text('value').notNull()});
export const groups=sqliteTable('groups',{id:text('id').primaryKey(),userId:text('user_id').notNull(),name:text('name').notNull()},t=>[index('idx_groups_user').on(t.userId)]);
export const budgets=sqliteTable('budgets',{userId:text('user_id').primaryKey(),amount:real('amount').notNull().default(0)});



