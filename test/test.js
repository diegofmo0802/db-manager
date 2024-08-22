// @ts-check
import './schemaTest.js';
import { Utilities } from 'saml.servercore';
import Manager from '../build/Manager.js';
import { users, posts } from './schemas.js';

Utilities.loadEnv('db.env');

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || '27017';
const USER = process.env.DB_USER
const PASS = process.env.DB_PASS

const manager = new Manager({
    host: HOST,
    port: parseInt(PORT),
    username: USER,
    password: PASS
});

const dbSession = manager.dbSession('sky-gallery', {
    users, posts
});

const res = await dbSession.operation(async (db) => {
    await db.init();
    const users = db.collection('users');
    const posts = db.collection('posts');
    const userCount = await users.countDocuments();
    const postCount = await posts.countDocuments();
    return { userCount, postCount };
});

console.log(res);