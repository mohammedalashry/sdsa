import { ContactRepository } from "./contact.repository";
import { ContactFormData, ContactResponse, ContactListResponse } from "./contact.types";
import { ApiError } from "@/core/middleware/error.middleware";

export class ContactService {
  constructor(private readonly repository: ContactRepository) {}

  /**
   * Submit a contact form
   */
  async createContact(contactData: ContactFormData): Promise<ContactResponse> {
    try {
      // Validate required fields
      if (!contactData.first_name?.trim()) {
        throw new ApiError(400, "First name is required");
      }
      if (!contactData.last_name?.trim()) {
        throw new ApiError(400, "Last name is required");
      }
      if (!contactData.email?.trim()) {
        throw new ApiError(400, "Email is required");
      }
      if (!contactData.contact_number?.trim()) {
        throw new ApiError(400, "Contact number is required");
      }
      if (!contactData.message?.trim()) {
        throw new ApiError(400, "Message is required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactData.email)) {
        throw new ApiError(400, "Invalid email format");
      }

      return await this.repository.createContact(contactData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Contact service error:", error);
      throw new ApiError(500, "Failed to submit contact form");
    }
  }

  /**
   * Get all contacts (admin only)
   */
  async getContacts(options: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<ContactListResponse> {
    try {
      // Validate pagination parameters
      if (options.page < 1) {
        throw new ApiError(400, "Page must be greater than 0");
      }
      if (options.pageSize < 1 || options.pageSize > 100) {
        throw new ApiError(400, "Page size must be between 1 and 100");
      }

      return await this.repository.getContacts(options);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Get contacts service error:", error);
      throw new ApiError(500, "Failed to fetch contacts");
    }
  }

  /**
   * Get contact by ID (admin only)
   */
  async getContactById(id: number): Promise<ContactResponse> {
    try {
      if (!id || id <= 0) {
        throw new ApiError(400, "Valid contact ID is required");
      }

      const contact = await this.repository.getContactById(id);
      if (!contact) {
        throw new ApiError(404, "Contact not found");
      }

      return contact;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Get contact by ID service error:", error);
      throw new ApiError(500, "Failed to fetch contact");
    }
  }

  /**
   * Mark contact as handled (admin only)
   */
  async markAsHandled(contactId: number, adminId: number): Promise<ContactResponse> {
    try {
      if (!contactId || contactId <= 0) {
        throw new ApiError(400, "Valid contact ID is required");
      }
      if (!adminId || adminId <= 0) {
        throw new ApiError(400, "Valid admin ID is required");
      }

      // Check if contact exists
      const existingContact = await this.repository.getContactById(contactId);
      if (!existingContact) {
        throw new ApiError(404, "Contact not found");
      }

      return await this.repository.markAsHandled(contactId, adminId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Mark contact as handled service error:", error);
      throw new ApiError(500, "Failed to mark contact as handled");
    }
  }
}

