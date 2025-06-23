import { fetchCustomers } from "@/app/lib/data";

export async function GET() {
  try {
    const customers = await fetchCustomers();

    return Response.json(customers);
  } catch (error) {
    console.error("API Error:", error);

    return Response.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
