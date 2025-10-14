import { Router } from "express";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { ContactRepository } from "./contact.repository";
import { validateRequest } from "../../core/middleware/validation.middleware";
import { authenticate } from "../../core/middleware/auth.middleware";
import { contactValidationSchemas } from "./contact.validator";

const router = Router();

// Dependency injection setup
const contactRepository = new ContactRepository();
const contactService = new ContactService(contactRepository);
const contactController = new ContactController(contactService);

// POST /api/contact/ - Submit contact form (public)
router.post(
  "/",
  validateRequest(contactValidationSchemas.createContact, "body"),
  contactController.createContact,
);

// GET /api/contact/ - Get all contacts (admin only)
router.get(
  "/",
  authenticate,
  validateRequest(contactValidationSchemas.getContacts, "query"),
  contactController.getContacts,
);

// GET /api/contact/:id - Get contact by ID (admin only)
router.get("/:id", authenticate, contactController.getContactById);

// PATCH /api/contact/:id/handle - Mark contact as handled (admin only)
router.patch("/:id/handle", authenticate, contactController.markAsHandled);

export default router;

