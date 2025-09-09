import { Router } from "express";
import { ContactController } from "./contact.controller";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { contactValidationSchemas } from "./contact.validator";

const router = Router();
const contactController = new ContactController();

// Based on Excel sheet endpoints

// GET /api/contact/ - Get contacts with pagination
router.get(
  "/",
  validateRequest(contactValidationSchemas.getContacts, "query"),
  contactController.getAllContacts,
);

// POST /api/contact/ - Create contact
router.post(
  "/",
  validateRequest(contactValidationSchemas.createContact, "body"),
  contactController.createContact,
);

export default router;

