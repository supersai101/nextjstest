// app/api/invoices/route.ts
import { z } from "zod";
import postgres from "postgres";
import { NextRequest } from "next/server";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  status: z.enum(["pending", "paid"], {
    errorMap: () => ({ message: "Status must be either 'pending' or 'paid'" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate the request body
    const validatedFields = CreateInvoiceSchema.safeParse(body);

    if (!validatedFields.success) {
      return Response.json(
        {
          success: false,
          errors: validatedFields.error.flatten().fieldErrors,
          message: "Missing or invalid fields. Failed to create invoice.",
        },
        { status: 400 }
      );
    }

    const { customerId, amount, status } = validatedFields.data;

    // Convert amount to cents and get current date
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];

    // Insert into database
    const result = await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      RETURNING id, customer_id, amount, status, date
    `;

    const createdInvoice = result[0];

    return Response.json(
      {
        success: true,
        message: "Invoice created successfully",
        data: {
          ...createdInvoice,
          amount: createdInvoice.amount / 100, // Convert back to dollars for response
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Database Error:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to create invoice. Please try again.",
      },
      { status: 500 }
    );
  }
}

// GET all invoices (bonus)
export async function GET() {
  try {
    const invoices = await sql`
      SELECT 
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status,
        invoices.date,
        customers.name,
        customers.email
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
    `;

    const formattedInvoices = invoices.map((invoice) => ({
      ...invoice,
      amount: invoice.amount / 100, // Convert cents to dollars
    }));

    return Response.json({
      success: true,
      data: formattedInvoices,
    });
  } catch (error) {
    console.error("Database Error:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to fetch invoices",
      },
      { status: 500 }
    );
  }
}
