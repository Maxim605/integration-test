import { TestEnvironmentManager } from "./environment-manager";

export default async function globalTeardown(): Promise<void> {
  try {
    const manager = TestEnvironmentManager.getInstance();
    await manager.cleanup();
  } catch (error) {
    console.error("Error in global teardown:", error);
    throw error;
  }
}
