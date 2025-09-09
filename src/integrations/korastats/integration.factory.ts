import { IntegrationService } from "./integration-service.interface";
import { KorastatsClient } from "./client";
import { KorastatsIntegrationService } from "./integration.service";

console.log("🏭 Creating KorastatsClient in IntegrationFactory...");
const client = new KorastatsClient();
console.log("🏭 KorastatsClient created successfully in IntegrationFactory");

export class IntegrationFactory {
  public static getIntegrationService(): IntegrationService {
    console.log("🏭 IntegrationFactory.getIntegrationService() called");
    return new KorastatsIntegrationService(client);
  }
}

