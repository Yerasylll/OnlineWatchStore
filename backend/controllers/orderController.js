const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrder,
    updateOrderStatus,
    updateOrderPayment,
    deleteOrder,
    getOrderStatistics,
    removeOrderItem
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .post(protect, createOrder)
    .get(protect, authorize('admin'), getAllOrders);

router.get('/my-orders', protect, getMyOrders);
router.get('/statistics', protect, authorize('admin'), getOrderStatistics);

router.route('/:id')
    .get(protect, getOrder)
    .delete(protect, deleteOrder);

router.delete('/:id/items', protect, removeOrderItem);
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.put('/:id/payment', protect, authorize('admin'), updateOrderPayment);

module.exports = router;