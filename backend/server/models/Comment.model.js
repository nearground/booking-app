import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const Comment = sequelize.define('Comment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    CommentableId: DataTypes.INTEGER, //primary key of the entity being commented (Experience, Hotel, Organizer, Comment)
    CommentableType: DataTypes.STRING, //type of the entity being commented (Experience, Hotel, Organizer, Comment)
    stars: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: true, validate: { len: { args: [0, 75], msg: 'Title must be 75 characters or fewer.' } } },
    comment: { type: DataTypes.TEXT, allowNull: false },
    repliesCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true },
    ParentId: { type: DataTypes.INTEGER, allowNull: true }, // for replies to comments
    anonymity: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false }, // 0 = fully anonymous, 1 = partially anonymous, 2 = not anonymous
    repliesDisabled: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    images: { type: DataTypes.JSON, defaultValue: [], allowNull: false },
}, {
    tableName: 'Comments',
    timestamps: true,
    validate: {
        commentableTypeValid() {
            const validTypes = ['Experience', 'Hotel', 'Organizer'];
            if (!validTypes.includes(this.CommentableType)) {
                throw new Error(`Commentable type must be one of: ${validTypes.join(', ')}`);
            }
        },
        starsInRange() {
            if (this.stars !== null && this.stars !== undefined) {
                if (this.stars < 1 || this.stars > 5) {
                    throw new Error('Stars must be between 1 and 5');
                }
            }
        },
        commentLength() {
            if (this.comment.length < 10 || this.comment.length > 1000) {
                throw new Error('Comment must be between 10 and 1000 characters long');
            }
        },
        anonymousLevel(){
            if (this.anonymity < 0 || this.anonymity > 2) {
                throw new Error('Anonymity must be 0 (not anonymous), 1 (partially anonymous), or 2 (fully anonymous)');
            }
        },
        imagesLimit() {
            if (!Array.isArray(this.images)) {
                throw new Error('Images must be an array');
            }
            if (this.images.length > 10) {
                throw new Error('Images cannot exceed 10 items');
            }
        }
    },
    getterMethods: {
        commentable() {
            const type = String(this.CommentableType || '').toLowerCase();
            if (type === 'experience' && this.experience !== undefined) {
                return this.experience;
            } else if (type === 'hotel' && this.hotel !== undefined) {
                return this.hotel;
            } else if (type === 'organizer' && this.organizer !== undefined) {
                return this.organizer;
            }
            return null;
        }
    }
});

// Association will be set in models/index.js
export default Comment;
