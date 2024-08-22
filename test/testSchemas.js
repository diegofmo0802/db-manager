// @ts-check
import Schema from "../build/Schema/Schema.js";

export const posts = new Schema({
    _id: { type: 'string', minLength: 36, maxLength: 36, },
    title: { type: 'string', minLength: 5, maxLength: 50, },
    description: { type: 'string', minLength: 5, maxLength: 500, },
    image: { type: 'string', },
    user: { type: 'string', minLength: 36, maxLength: 36, },
    place: { type: 'string', minLength: 3, maxLength: 20, },
    published: { type: 'boolean', },
    createdAt: { type: 'number', },
    updatedAt: { type: 'number', },
    publishedAt: { type: 'number', },
    tags: { type: 'array', property: {
        type: 'string', minLength: 3, maxLength: 20,
    } },
    peoples: { type: 'array', property: {
        type: 'string', minLength: 3, maxLength: 20,
    }, }
});

export const users = new Schema({
    _id: { type: 'string', required: true, minLength: 36, maxLength: 36, },
    profile: { type: 'object', required: true, schema: {
        username: { type: 'string', unique: true, required: true, minLength: 3, maxLength: 20, },
        biography: { type: 'string', nullable: true, maxLength: 500 },
        avatar: { type: 'string', nullable: true, default: '/avatars/default.png' },
        role: { type: 'string', default: 'user' },
    } },
    email: { type: 'object', required: true, schema: {
        address: {
            type: 'string', unique: true, required: true,
            minLength: 5, maxLength: 50,
            pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
        },
        verified: { type: 'boolean', default: false },
        verifyToken: { type: 'string', nullable: true, }
    }, },
    auth: { type: 'object', required: true, schema: {
        passwordHash: { type: 'string', required: true, minLength: 256, maxLength: 256, },
        passwordSalt: { type: 'string', required: true, minLength: 32, maxLength: 32, }
    } }
});