/**
 * Migration Script: Local JSON to MongoDB
 * Run this to sync your local data to your new Cloud MongoDB database.
 * Usage: node scripts/migrate-to-mongodb.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');

async function migrate() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env file');
        process.exit(1);
    }

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        console.log('⏳ Connecting to MongoDB...');
        await client.connect();
        const db = client.db('quiz_engine');
        console.log('✅ Connected!');

        const files = await fs.readdir(DATA_DIR);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        for (const file of jsonFiles) {
            console.log(`\n📦 Processing ${file}...`);
            const filePath = path.join(DATA_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const quizData = JSON.parse(content);

            if (!quizData.topic || !Array.isArray(quizData.questions)) {
                console.warn(`⚠️  Skipping ${file}: Invalid format`);
                continue;
            }

            const topicId = path.basename(file, '.json').toLowerCase().replaceAll(/[^a-z0-9_-]/g, '_');

            // 1. Update Topic Metadata
            await db.collection('topics').updateOne(
                { id: topicId },
                {
                    $set: {
                        name: quizData.topic,
                        questionCount: quizData.questions.length,
                        updatedAt: new Date(),
                        isBuiltIn: true // Mark these as migrated built-ins
                    }
                },
                { upsert: true }
            );

            // 2. Sync Questions
            console.log(`   - Deleting old questions for "${topicId}"...`);
            await db.collection('questions').deleteMany({ topicId });

            console.log(`   - Inserting ${quizData.questions.length} questions...`);
            const questionsToInsert = quizData.questions.map((q, idx) => ({
                ...q,
                topicId,
                id: q.id || idx + 1
            }));

            await db.collection('questions').insertMany(questionsToInsert);
            console.log(`✅  Synced ${file}`);
        }

        console.log('\n✨ Migration complete! All local topics are now in MongoDB.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await client.close();
    }
}

await migrate();
