import { Request, Response } from "express";
import { ContactService } from "./contact.service";
import { catchAsync } from "../../core/utils/catch-async";
import { ContactFormData, ContactResponse, ContactListResponse } from "./contact.types";

export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * POST /api/contact/
   * Submit a contact form (public endpoint)
   */
  createContact = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const contactData: ContactFormData = req.body;

    const result: ContactResponse = await this.contactService.createContact(contactData);

    res.status(201).json({
      message: "Contact form submitted successfully",
      contact: result,
    });
  });

  /**
   * GET /api/contact/
   * Get all contacts (admin only)
   */
  getContacts = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize, search } = req.query;

    const result: ContactListResponse = await this.contactService.getContacts({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      search: search as string,
    });

    res.json(result);
  });

  /**
   * GET /api/contact/:id
   * Get contact by ID (admin only)
   */
  getContactById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const result: ContactResponse = await this.contactService.getContactById(Number(id));

    res.json(result);
  });

  /**
   * PATCH /api/contact/:id/handle
   * Mark contact as handled (admin only)
   */
  markAsHandled = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const adminId = (req as any).user?.id;

    if (!adminId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const result: ContactResponse = await this.contactService.markAsHandled(
      Number(id),
      adminId,
    );

    res.json({
      message: "Contact marked as handled successfully",
      contact: result,
    });
  });
}

