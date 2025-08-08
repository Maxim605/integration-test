export default async function globalSetup(): Promise<void> {
  process.env.SETTINGS_FILE = "./settings.spec.yml";
  try {
    // global setup initialization params
  } catch (error) {
    console.error("Error in global setup:", error);
    throw error;
  }
}
