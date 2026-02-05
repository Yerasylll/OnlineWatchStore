const { reviews, watches, toObjectId, ObjectId } = require('../models/collections');

exports.createReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const watchId = req.params.watchId;

        const watch = await watches().findOne({ _id: toObjectId(watchId) });
        if (!watch) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        const existingReview = await reviews().findOne({
            watch: toObjectId(watchId),
            user: toObjectId(req.user.id)
        });

        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this watch' });
        }

        const result = await reviews().insertOne({
            watch: toObjectId(watchId),
            user: toObjectId(req.user.id),
            rating,
            comment,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await updateWatchRating(watchId);

        const populatedReview = await reviews().aggregate([
            { $match: { _id: result.insertedId } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    watch: 1,
                    user: {
                        _id: '$userInfo._id',
                        name: '$userInfo.name'
                    },
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]).toArray();

        res.status(201).json({ success: true, data: populatedReview[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getWatchReviews = async (req, res) => {
    try {
        const reviewList = await reviews().aggregate([
            { $match: { watch: toObjectId(req.params.watchId) } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    watch: 1,
                    user: {
                        _id: '$userInfo._id',
                        name: '$userInfo.name'
                    },
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]).toArray();

        res.status(200).json({ success: true, count: reviewList.length, data: reviewList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;

        const review = await reviews().findOne({ _id: toObjectId(req.params.id) });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updateData = {
            updatedAt: new Date()
        };
        if (rating) updateData.rating = rating;
        if (comment) updateData.comment = comment;

        await reviews().updateOne(
            { _id: toObjectId(req.params.id) },
            { $set: updateData }
        );

        await updateWatchRating(review.watch);

        const populatedReview = await reviews().aggregate([
            { $match: { _id: toObjectId(req.params.id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    watch: 1,
                    user: {
                        _id: '$userInfo._id',
                        name: '$userInfo.name'
                    },
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]).toArray();

        res.status(200).json({ success: true, data: populatedReview[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const review = await reviews().findOne({ _id: toObjectId(req.params.id) });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const watchId = review.watch;
        await reviews().deleteOne({ _id: toObjectId(req.params.id) });

        await updateWatchRating(watchId);

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateWatchRating = async (watchId) => {
    const watchObjectId = typeof watchId === 'string' ? toObjectId(watchId) : watchId;

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