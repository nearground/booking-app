import User from '../../server/models/User.model.js';

describe('user email identity', () => {
    test('declares a database unique constraint on email', () => {
        expect(User.rawAttributes.email.unique).toBe(true);
        expect(User.rawAttributes.email.allowNull).toBe(false);
    });

    test('normalizes email on creation and updates before validating', async () => {
        const user = User.build({ username: 'normalized-user', email: '  Customer@Example.COM  ' });
        await user.validate();
        expect(user.email).toBe('customer@example.com');

        user.email = '  Updated@Example.COM ';
        await user.validate();
        expect(user.email).toBe('updated@example.com');
    });
});
