import { createHash } from 'node:crypto';
import { DataTypes, QueryTypes, Transaction } from 'sequelize';
import { SEED_SCHEMA } from './index.js';

const LOCK_KEY = '__seed_factory_lock__';
const allowedModels = new Set(Object.values(SEED_SCHEMA).map(({ model }) => model));
const canonical = (value) => {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    }
    return value;
};
const digest = (row) => createHash('sha256').update(JSON.stringify(canonical(row))).digest('hex');
const identity = (model, row) => Object.fromEntries(model.primaryKeyAttributes.map((key) => [key, row[key]]));
const token = (table, where) => `${table}:${JSON.stringify(canonical(where))}`;

export function assertSeedEnvironment(sequelize, env = process.env) {
    if (!['development', 'test'].includes(env.NODE_ENV)) {
        throw new Error('Seed factory is restricted to development/test environments');
    }
    if (env.SEED_FACTORY_ENABLED !== 'true' || env.SEED_DATABASE !== sequelize.config.database) {
        throw new Error('Set SEED_FACTORY_ENABLED=true and SEED_DATABASE to the exact target database');
    }
}

export function createSequelizeSeedStore(db, { env = process.env, onCleanupPlan } = {}) {
    const { sequelize } = db;
    const Run = sequelize.models.SeedRun || sequelize.define('SeedRun', {
        seedKey: { type: DataTypes.STRING(64), primaryKey: true },
        manifest: { type: DataTypes.JSON, allowNull: false },
    }, { tableName: 'SeedRuns', timestamps: true });
    const Asset = sequelize.models.SeedAsset || sequelize.define('SeedAsset', {
        objectKey: { type: DataTypes.STRING(512), primaryKey: true },
        seedKey: { type: DataTypes.STRING(64), allowNull: false },
        state: { type: DataTypes.ENUM('staged', 'active', 'delete'), allowNull: false },
    }, { tableName: 'SeedAssets', timestamps: true });
    const modelFor = (name) => {
        if (!allowedModels.has(name) || !sequelize.models[name]) throw new Error(`Seed model is not allowed: ${name}`);
        return sequelize.models[name];
    };
    const readOwned = async (record, transaction) => {
        const model = modelFor(record.model);
        const row = await model.findOne({ where: record.where, transaction, raw: true, lock: transaction.LOCK.UPDATE });
        if (!row || digest(row) !== record.digest) {
            throw new Error(`Seed-owned row changed or is missing: ${record.model}/${record.key}; cleanup refused`);
        }
        return row;
    };
    const inspectMedia = async (keys, owned, transaction) => {
        const containsAsset = (value, key) => {
            if (typeof value === 'string') return value === key || value.endsWith(`/${key}`);
            if (value && typeof value === 'object') return Object.values(value).some((item) => containsAsset(item, key));
            return false;
        };
        for (const model of Object.values(sequelize.models)) {
            if (['SeedRun', 'SeedAsset'].includes(model.name)) continue;
            const fields = Object.keys(model.rawAttributes).filter((field) => ['JSON', 'STRING', 'TEXT'].includes(model.rawAttributes[field].type.key));
            if (!fields.length) continue;
            const rows = await model.findAll({
                attributes: [...new Set([...model.primaryKeyAttributes, ...fields])],
                transaction, raw: true, lock: transaction.LOCK.UPDATE,
            });
            for (const row of rows) {
                if (!owned.has(token(model.getTableName(), identity(model, row))) && keys.some((key) => containsAsset(row, key))) {
                    throw new Error(`External media reference from ${model.name}; cleanup refused`);
                }
            }
        }
    };

    return {
        Run,
        Asset,
        async initialize() {
            assertSeedEnvironment(sequelize, env);
            // These are service-owned bookkeeping tables, not application schema migrations.
            await Run.sync();
            await Asset.sync();
            await Run.findOrCreate({ where: { seedKey: LOCK_KEY }, defaults: { manifest: {} } });
        },
        async transaction(callback) {
            assertSeedEnvironment(sequelize, env);
            return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (transaction) => {
                const lock = await Run.findByPk(LOCK_KEY, { transaction, lock: transaction.LOCK.UPDATE });
                if (!lock) throw new Error('Seed store must be initialized before use');
                return callback(transaction);
            });
        },
        async findSeed(seedKey, transaction) {
            const run = await Run.findByPk(seedKey, { transaction });
            return run ? run.manifest : null;
        },
        async assertAssetsUnreferenced(keys, transaction) {
            await inspectMedia(keys, new Set(), transaction);
        },
        async insert(name, attributes, { key, transaction }) {
            const model = modelFor(name);
            for (const field of Object.keys(attributes)) {
                if (!Object.hasOwn(model.rawAttributes, field) || model.rawAttributes[field].autoIncrement) {
                    throw new Error(`Unknown or protected seed field: ${name}.${field}`);
                }
            }
            // Validate values, but avoid asynchronous scheduler and random-number hooks.
            const row = await model.create(attributes, { transaction, hooks: false, validate: true });
            const plain = row.get({ plain: true });
            return { key, model: name, id: plain.id, where: identity(model, plain) };
        },
        async update(record, attributes, transaction) {
            const model = modelFor(record.model);
            for (const field of Object.keys(attributes)) {
                if (!Object.hasOwn(model.rawAttributes, field) || model.primaryKeyAttributes.includes(field)) {
                    throw new Error(`Unknown or protected seed field: ${record.model}.${field}`);
                }
            }
            const row = await model.findOne({ where: record.where, transaction });
            if (!row) throw new Error(`Missing seed row: ${record.key}`);
            await row.update(attributes, { transaction, hooks: false, validate: true });
        },
        async saveSeed(seedKey, manifest, transaction) {
            if (!/^[a-f0-9]{10,64}$/.test(seedKey)) throw new Error('Invalid seed key');
            for (const record of manifest.records) {
                const row = await modelFor(record.model).findOne({ where: record.where, transaction, raw: true });
                record.digest = digest(row);
            }
            await Run.create({ seedKey, manifest }, { transaction });
            if (manifest.media?.length) {
                await Asset.update({ state: 'active' }, { where: { seedKey, objectKey: manifest.media, state: 'staged' }, transaction });
            }
        },
        async inspectCleanup(seedKey, transaction) {
            const manifest = await this.findSeed(seedKey, transaction);
            if (!manifest) throw new Error(`Unknown seed manifest: ${seedKey}; cleanup refused`);
            const owned = new Set(manifest.records.map((record) => token(modelFor(record.model).getTableName(), record.where)));
            if (manifest.media?.length) {
                await inspectMedia(manifest.media, owned, transaction);
            }
            const fks = await sequelize.query(
                `SELECT TABLE_NAME AS childTable, COLUMN_NAME AS childColumn,
                        REFERENCED_TABLE_NAME AS parentTable, REFERENCED_COLUMN_NAME AS parentColumn
                 FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`,
                { type: QueryTypes.SELECT, transaction }
            );
            const quote = (name) => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
            for (const record of manifest.records) {
                const model = modelFor(record.model);
                const row = await readOwned(record, transaction);
                const table = model.getTableName();
                const references = fks.filter((fk) => fk.parentTable === table);
                // Polymorphic links are not declared as database foreign keys.
                if (['Experience', 'Organizer'].includes(record.model)) {
                    references.push({ childTable: 'Comments', childColumn: 'CommentableId', parentColumn: 'id', scope: { CommentableType: record.model } });
                }
                if (record.model === 'Experience') {
                    for (const childTable of ['OrderItems', 'CartItems']) {
                        references.push({ childTable, childColumn: 'ProductId', parentColumn: 'id', scope: { ProductType: 'Experience' } });
                    }
                }
                if (record.model === 'User') {
                    for (const childTable of ['PasswordResets', 'EmailVerificationTokens']) {
                        references.push({ childTable, childColumn: 'email', parentColumn: 'email' });
                    }
                }
                for (const ref of references) {
                    const child = Object.values(sequelize.models).find((candidate) => candidate.getTableName() === ref.childTable);
                    if (!child) throw new Error(`Unmodeled dependent table ${ref.childTable}; cleanup refused`);
                    const scope = ref.scope || {};
                    const conditions = [`${quote(ref.childColumn)} = :value`, ...Object.keys(scope).map((field) => `${quote(field)} = :${field}`)];
                    const rows = await sequelize.query(`SELECT * FROM ${quote(ref.childTable)} WHERE ${conditions.join(' AND ')} FOR UPDATE`, {
                        replacements: { value: row[ref.parentColumn], ...scope }, type: QueryTypes.SELECT, transaction,
                    });
                    for (const dependent of rows) {
                        if (!owned.has(token(ref.childTable, identity(child, dependent)))) {
                            throw new Error(`External reference from ${ref.childTable} to ${record.model}/${record.key}; cleanup refused`);
                        }
                    }
                }
            }
            return manifest;
        },
        async deleteSeed(seedKey, transaction) {
            const manifest = await this.inspectCleanup(seedKey, transaction);
            if (onCleanupPlan) {
                await onCleanupPlan({
                    seedKey, records: manifest.records.map(({ model, where }) => ({ model, where })),
                    media: manifest.media || [],
                });
            }
            // Organization -> headquarters -> organization is the one intentional cycle.
            for (const record of manifest.records.filter(({ model }) => model === 'Organization')) {
                await modelFor('Organization').update({ LocationId: null }, { where: record.where, transaction, hooks: false });
            }
            for (const record of [...manifest.records].reverse()) {
                const deleted = await modelFor(record.model).destroy({ where: record.where, transaction, hooks: false });
                if (deleted !== 1) throw new Error(`Seed cleanup row count mismatch: ${record.key}`);
            }
            for (const objectKey of manifest.media || []) {
                await Asset.update({ state: 'delete' }, {
                    where: { objectKey, seedKey, state: 'active' }, transaction,
                });
            }
            await Run.destroy({ where: { seedKey }, transaction });
            return true;
        },
    };
}
