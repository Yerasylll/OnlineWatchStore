const { users, reviews, watches, toObjectId, ObjectId } = require('../models/collections');

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        const updateData = {
            updatedAt: new Date()
        };
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;

        const user = await users().findOneAndUpdate(
            { _id: toObjectId(req.user.id) },
            { $set: updateData },
            { returnDocument: 'after', projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addAddress = async (req, res) => {
    try {
        const { street, city, state, zipCode, country, isDefault } = req.body;

        const user = await users().findOne({ _id: toObjectId(req.user.id) });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const newAddress = {
            _id: new ObjectId(),
            street,
            city,
            state,
            zipCode,
            country: country || 'Kazakhstan',
            isDefault: isDefault || false
        };

        const updateOperations = {
            $push: { addresses: newAddress },
            $set: { updatedAt: new Date() }
        };

        if (isDefault) {
            await users().updateOne(
                { _id: toObjectId(req.user.id) },
                { $set: { 'addresses.$[].isDefault': false } }
            );
        }

        const updatedUser = await users().findOneAndUpdate(
            { _id: toObjectId(req.user.id) },
            updateOperations,
            { returnDocument: 'after', projection: { password: 0 } }
        );

        res.status(201).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { street, city, state, zipCode, country, isDefault } = req.body;

        const user = await users().findOne({ _id: toObjectId(req.user.id) });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const addressIndex = user.addresses.findIndex(
            addr => addr._id.toString() === addressId
        );

        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const updateFields = {};
        if (street) updateFields[`addresses.${addressIndex}.street`] = street;
        if (city) updateFields[`addresses.${addressIndex}.city`] = city;
        if (state) updateFields[`addresses.${addressIndex}.state`] = state;
        if (zipCode) updateFields[`addresses.${addressIndex}.zipCode`] = zipCode;
        if (country) updateFields[`addresses.${addressIndex}.country`] = country;
        if (isDefault !== undefined) updateFields[`addresses.${addressIndex}.isDefault`] = isDefault;
        updateFields.updatedAt = new Date();

        if (isDefault) {
            await users().updateOne(
                { _id: toObjectId(req.user.id) },
                { $set: { 'addresses.$[].isDefault': false } }
            );
        }

        const updatedUser = await users().findOneAndUpdate(
            { _id: toObjectId(req.user.id) },
            { $set: updateFields },
            { returnDocument: 'after', projection: { password: 0 } }
        );

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;

        const updatedUser = await users().findOneAndUpdate(
            { _id: toObjectId(req.user.id) },
            {
                $pull: { addresses: { _id: toObjectId(addressId) } },
                $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after', projection: { password: 0 } }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const userList = await users().find({}, { projection: { password: 0 } }).toArray();
        res.status(200).json({ success: true, count: userList.length, data: userList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const userObjectId = toObjectId(userId);

        // 1. Find all reviews by this user to identify affected watches
        const userReviews = await reviews().find({ user: userObjectId }).toArray();
        const affectedWatchIds = [...new Set(userReviews.map(r => r.watch.toString()))];

        // 2. Delete all reviews by this user
        await reviews().deleteMany({ user: userObjectId });

        // 3. Recalculate ratings for all affected watches
        for (const watchId of affectedWatchIds) {
            await updateWatchRating(toObjectId(watchId));
        }

        // 4. Delete the user
        const result = await users().findOneAndDelete(
            { _id: userObjectId }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User and associated reviews deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function to recalculate watch rating (duplicated from reviewController to avoid circular deps or complex refactor)
const updateWatchRating = async (watchObjectId) => {
    const stats = await reviews().aggregate([
        {
            $match: { watch: watchObjectId }
        },
        {
            $group: {
                _id: '$watch',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]).toArray();

    if (stats.length > 0) {
        await watches().updateOne(
            { _id: watchObjectId },
            {
                $set: {
                    averageRating: stats[0].averageRating,
                    reviewCount: stats[0].reviewCount
                }
            }
        );
    } else {
        // No more reviews for this watch
        await watches().updateOne(
            { _id: watchObjectId },
            {
                $set: {
                    averageRating: 0,
                    reviewCount: 0
                }
            }
        );
    }
};