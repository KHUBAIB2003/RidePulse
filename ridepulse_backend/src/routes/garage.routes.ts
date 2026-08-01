import { Router } from 'express';
import { GarageController } from '../controllers/garage.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

// Garage Statistics & Search
router.get('/statistics', GarageController.getStatistics);
router.get('/search', GarageController.getBikes);

// Bike Base CRUD
router.get('/', GarageController.getBikes);
router.post('/', GarageController.createBike);
router.get('/:id', GarageController.getBikeById);
router.put('/:id', GarageController.updateBike);
router.delete('/:id', GarageController.deleteBike);

// Default & Archive State Triggers
router.patch('/:id/default', GarageController.setDefaultBike);
router.patch('/:id/archive', GarageController.archiveBike);

// Maintenance Service History
router.post('/:id/maintenance', GarageController.addMaintenance);
router.get('/:id/maintenance', GarageController.getMaintenance);

// Expense Tracking
router.post('/:id/expenses', GarageController.addExpense);
router.get('/:id/expenses', GarageController.getExpenses);

// Fuel Fill Records & Economy Log
router.post('/:id/fuel', GarageController.addFuelLog);
router.get('/:id/fuel', GarageController.getFuelLogs);

export default router;
