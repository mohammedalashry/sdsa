import { Request, Response } from "express";
import { ContactService } from "./contact.service";
import { catchAsync } from "../../core/utils/catch-async";

export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * GET /api/contact/
   * Get contacts with pagination
   */
  getAllContacts = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = req.query;

    const contacts = await this.contactService.getContacts({
      page: page as number,
      pageSize: pageSize as number,
    });

    res.json(contacts);
  });

  /**
   * POST /api/contact/
   * Create contact
   */
  createContact = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const contactData = req.body;

    const contact = await this.contactService.createContact(contactData);

    res.status(201).json(contact);
  });
}

