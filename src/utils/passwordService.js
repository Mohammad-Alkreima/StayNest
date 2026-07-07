const argon2 = require("argon2");

class PasswordService {
    async hash(password) {
        try {
            return await argon2.hash(password, {
                type: argon2.argon2id,
                memoryCost: 2 ** 16, // 64MB
                timeCost: 3,
                parallelism: 1,
                hashLength: 32
            });
        } catch (error) {
            throw new Error("Hashed Error `argon2`")
        }
    }

    async compare(password, hashed) {
        try {
            return await argon2.verify(hashed, password);
        } catch (error) {
            throw new Error("Verified Error `argon2`")
        }
    }
}

module.exports = new PasswordService();