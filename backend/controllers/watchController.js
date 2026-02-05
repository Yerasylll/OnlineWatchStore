const { watches, reviews, toObjectId, ObjectId } = require('../models/collections');

exports.getAllWatches = async (req, res) => {
    try {
        const { category, brand, minPrice, maxPrice, search, sort, page = 1, limit = 12 } = req.query;

        const query = {};

        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (search) {
            query.$text = { $search: search };
        }

        let sortOption = {};
        if (sort === 'price_asc') sortOption.price = 1;
        else if (sort === 'price_desc') sortOption.price = -1;
        else if (sort === 'newest') sortOption.createdAt = -1;
        else if (sort === 'rating') sortOption.averageRating = -1;
        else sortOption.createdAt = -1;

        const skip = (page - 1) * Number(limit);

        const watchList = await watches()
            .find(query)
            .sort(sortOption)
            .limit(Number(limit))
            .skip(skip)
            .toArray();

        const total = await watches().countDocuments(query);

        res.status(200).json({
            success: true,
            count: watchList.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: watchList
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getWatch = async (req, res) => {
    try {
        const watch = await watches().findOne({ _id: toObjectId(req.params.id) });

        if (!watch) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        res.status(200).json({ success: true, data: watch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createWatch = async (req, res) => {
    try {
        const watchData = {
            ...req.body,
            averageRating: 0,
            reviewCount: 0,
            featured: req.body.featured || false,
            images: req.body.images || [],
            image: req.body.image || (req.body.images && req.body.images.length > 0 ? req.body.images[0] : null),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await watches().insertOne(watchData);
        const watch = await watches().findOne({ _id: result.insertedId });

        res.status(201).json({ success: true, data: watch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateWatch = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };

        const result = await watches().findOneAndUpdate(
            { _id: toObjectId(req.params.id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteWatch = async (req, res) => {
    try {
        const watch = await watches().findOneAndDelete({ _id: toObjectId(req.params.id) });

        if (!watch) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        await reviews().deleteMany({ watch: toObjectId(req.params.id) });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateStock = async (req, res) => {
    try {
        const { quantity, operation } = req.body;

        const updateOperation = operation === 'add'
            ? { $inc: { stock: quantity } }
            : { $inc: { stock: -quantity } };

        const watch = await watches().findOneAndUpdate(
            { _id: toObjectId(req.params.id) },
            updateOperation,
            { returnDocument: 'after' }
        );

        if (!watch) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        if (watch.stock < 0) {
            await watches().updateOne(
                { _id: toObjectId(req.params.id) },
                { $set: { stock: 0 } }
            );
            watch.stock = 0;
        }

        res.status(200).json({ success: true, data: watch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getWatchStatistics = async (req, res) => {
    try {
        const statistics = await watches().aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    averagePrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' },
                    totalStock: { $sum: '$stock' },
                    averageRating: { $avg: '$averageRating' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        const brandStats = await watches().aggregate([
            {
                $group: {
                    _id: '$brand',
                    count: { $sum: 1 },
                    averagePrice: { $avg: '$price' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]).toArray();

        const totalWatches = await watches().countDocuments();
        const totalValue = await watches().aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ['$price', '$stock'] } }
                }
            }
        ]).toArray();

        res.status(200).json({
            success: true,
            data: {
                categoryStatistics: statistics,
                brandStatistics: brandStats,
                totalWatches,
                totalInventoryValue: totalValue.length > 0 ? totalValue[0].total : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFeaturedWatches = async (req, res) => {
    try {
        const watchList = await watches().find({ featured: true }).limit(6).toArray();
        res.status(200).json({ success: true, count: watchList.length, data: watchList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Image URL is required' });
        }

        const watch = await watches().findOneAndUpdate(
            { _id: toObjectId(req.params.id) },
            {
                $set: { image: imageUrl, updatedAt: new Date() }
            },
            { returnDocument: 'after' }
        );

        if (!watch) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        res.status(200).json({ success: true, data: watch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.removeImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        const current = await watches().findOne({ _id: toObjectId(req.params.id) });
        if (!current) {
            return res.status(404).json({ success: false, message: 'Watch not found' });
        }

        if (imageUrl && current.image && current.image !== imageUrl) {
            return res.status(404).json({ success: false, message: 'Image not found on this watch' });
        }

        const watch = await watches().findOneAndUpdate(
            { _id: toObjectId(req.params.id) },
            {
                $unset: { image: "" },
                $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after' }
        );

        res.status(200).json({ success: true, data: watch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};