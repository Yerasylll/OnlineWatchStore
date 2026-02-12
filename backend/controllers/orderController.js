const { orders, watches, users, toObjectId, ObjectId } = require('../models/collections');

exports.createOrder = async (req, res) => {
    try {
        // Accept both 'items' and 'orderItems' for compatibility
        const { items, orderItems, shippingAddress, paymentMethod } = req.body;
        const cartItems = orderItems || items;

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No order items provided' });
        }

        // Calculate total price and subtotal
        let subtotal = 0;
        const processedOrderItems = [];

        for (const item of cartItems) {
            // Handle both formats: { watchId, quantity } and { watch, quantity, brand, model, price }
            const watchId = item.watchId || item.watch;

            if (!watchId) {
                return res.status(400).json({ success: false, message: 'Invalid item format' });
            }

            const watch = await watches().findOne({ _id: toObjectId(watchId) });
            if (!watch) {
                return res.status(404).json({ success: false, message: `Watch not found: ${watchId}` });
            }

            const itemTotal = watch.price * item.quantity;
            subtotal += itemTotal;

            processedOrderItems.push({
                watch: toObjectId(watchId),
                brand: watch.brand,
                model: watch.model,
                price: watch.price,
                quantity: item.quantity
            });
        }

        // Calculate tax and shipping
        const tax = subtotal * 0.12;
        const shippingCost = subtotal > 500000 ? 0 : 5000;
        const totalPrice = subtotal + tax + shippingCost;

        const order = {
            user: toObjectId(req.user.id),
            orderItems: processedOrderItems,
            subtotal,
            tax,
            shippingCost,
            totalPrice,
            shippingAddress,
            paymentMethod: paymentMethod || 'Cash on Delivery',
            status: 'Pending',
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

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status' });
        }

        const updatedOrder = await orders().findOneAndUpdate(
            { _id: toObjectId(id) },
            {
                $set: {
                    status: status,
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
                    _id: '$status',
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
        const updatedItems = order.orderItems.filter(item => item._id.toString() !== itemId);

        if (updatedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Cannot remove all items from order' });
        }

        const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.12;
        const shippingCost = subtotal > 500000 ? 0 : 5000;
        const newTotalPrice = subtotal + tax + shippingCost;

        const updatedOrder = await orders().findOneAndUpdate(
            { _id: toObjectId(id) },
            {
                $set: {
                    orderItems: updatedItems,
                    subtotal,
                    tax,
                    shippingCost,
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