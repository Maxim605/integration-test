export default async function globalTeardown(): Promise<void> {
  try {
    // nothing to do: each spec is responsible for stopServices
  } catch (error) {
    console.error("Error in global teardown:", error);
    throw error;
  }
}
