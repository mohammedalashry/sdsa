import prismaService from "@/db/prismadb/prisma.service";
import { ContactFormData, ContactResponse, ContactListResponse } from "./contact.types";
import { ApiError } from "@/core/middleware/error.middleware";

export class ContactRepository {
  /**
   * Create a new contact submission
   */
  async createContact(contactData: ContactFormData): Promise<ContactResponse> {
    try {
      const contact = await prismaService.contact.create({
        data: {
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          email: contactData.email,
          contact_number: contactData.contact_number,
          message: contactData.message,
        },
      });

      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        contact_number: contact.contact_number,
        message: contact.message,
        handled_by_id: contact.handled_by_id || undefined,
      };
    } catch (error) {
      console.error("Create contact error:", error);
      throw new ApiError(500, "Failed to create contact submission");
    }
  }

  /**
   * Get all contacts with pagination and search
   */
  async getContacts(options: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<ContactListResponse> {
    try {
      const { page, pageSize, search } = options;
      const skip = (page - 1) * pageSize;

      // Build search conditions
      const searchConditions = search
        ? {
            OR: [
              { first_name: { contains: search, mode: "insensitive" as const } },
              { last_name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { contact_number: { contains: search, mode: "insensitive" as const } },
              { message: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      // Get total count
      const total = await prismaService.contact.count({
        where: searchConditions,
      });

      // Get contacts
      const contacts = await prismaService.contact.findMany({
        where: searchConditions,
        skip,
        take: pageSize,
        orderBy: { id: "desc" }, // Most recent first
        include: {
          handled_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      return {
        contacts: contacts.map((contact) => ({
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          contact_number: contact.contact_number,
          message: contact.message,
          handled_by_id: contact.handled_by_id || undefined,
        })),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      console.error("Get contacts error:", error);
      throw new ApiError(500, "Failed to fetch contacts");
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: number): Promise<ContactResponse | null> {
    try {
      const contact = await prismaService.contact.findUnique({
        where: { id },
        include: {
          handled_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      if (!contact) {
        return null;
      }

      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        contact_number: contact.contact_number,
        message: contact.message,
        handled_by_id: contact.handled_by_id || undefined,
      };
    } catch (error) {
      console.error("Get contact by ID error:", error);
      throw new ApiError(500, "Failed to fetch contact");
    }
  }

  /**
   * Mark contact as handled by admin
   */
  async markAsHandled(contactId: number, adminId: number): Promise<ContactResponse> {
    try {
      const contact = await prismaService.contact.update({
        where: { id: contactId },
        data: { handled_by_id: adminId },
        include: {
          handled_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        contact_number: contact.contact_number,
        message: contact.message,
        handled_by_id: contact.handled_by_id || undefined,
      };
    } catch (error) {
      console.error("Mark contact as handled error:", error);
      throw new ApiError(500, "Failed to mark contact as handled");
    }
  }
}

