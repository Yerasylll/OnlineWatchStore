const { orders, watches, users, toObjectId, ObjectId } = require('../models/collections');

exports.createOrder = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No order items provided' });
        }

        // Calculate total price
        let totalPrice = 0;
        const orderItems = [];

        for (const item of items) {
            const watch = await watches().findOne({ _id: toObjectId(item.watchId) });
            if (!watch) {
                return res.status(404).json({ success: false, message: `Watch not found: ${item.watchId}` });
            }

            const itemTotal = watch.price * item.quantity;
            totalPrice += itemTotal;

            orderItems.push({
                watch: toObjectId(item.watchId),
                name: watch.name,
                price: watch.price,
                quantity: item.quantity,
                image: watch.images && watch.images.length > 0 ? watch.images[0] : null
            });
        }

        const order = {
            user: toObjectId(req.user.id),
            items: orderItems,
            totalPrice,
            shippingAddress,
            paymentMethod: paymentMethod || 'Cash on Delivery',
            orderStatus: 'pending',
            isPaid: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await orders().insertOne(order);
        const createdOrder = await orders().findOne({ _id: result.insertedId });

        res.status(201).json({ success: true, data: createdOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const userOrders = await orders()
            .find({ user: toObjectId(req.user.id) })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({ success: true, count: userOrders.length, data: userOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const allOrders = await orders()
            .aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $unwind: '$userDetails'
                },
                {
                    $project: {
                        'userDetails.password': 0
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ])
            .toArray();

        res.status(200).json({ success: true, count: allOrders.length, data: allOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orders().findOne({ _id: toObjectId(id) });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if user owns this order or is admin
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status' });
        }

        const updatedOrder = await orders().findOneAndUpdate(
            { _id: toObjectId(id) },
            {
                $set: {
                    orderStatus: status,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrderPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPaid, paidAt } = req.body;

        const updatedOrder = await orders().findOneAndUpdate(
            { _id: toObjectId(id) },
            {
                $set: {
                    isPaid: isPaid || false,
                    paidAt: isPaid ? (paidAt || new Date()) : null,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orders().findOne({ _id: toObjectId(id) });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if user owns this order or is admin
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this order' });
        }

        await orders().deleteOne({ _id: toObjectId(id) });

        res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOrderStatistics = async (req, res) => {
    try {
        const stats = await orders().aggregate([
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalPrice' },
                    averageOrderValue: { $avg: '$totalPrice' }
                }
            }
        ]).toArray();

        const statusBreakdown = await orders().aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        res.status(200).json({
            success: true,
            data: {
                overall: stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
                byStatus: statusBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.removeOrderItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemId } = req.body;

        const order = await orders().findOne({ _id: toObjectId(id) });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if user owns this order
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this order' });
        }

        // Remove the item and recalculate total
        const updatedItems = order.items.filter(item => item._id.toString() !== itemId);

        if (updatedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Cannot remove all items from order' });
        }

        const newTotalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const updatedOrder = await orders().findOneAndUpdate(
            { _id: toObjectId(id) },
            {
                $set: {
                    items: updatedItems,
                    totalPrice: newTotalPrice,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};