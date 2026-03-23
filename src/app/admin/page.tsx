import { AdminOverviewContent } from "@/components/admin/AdminOverviewContent";
import { getAdminOverviewData } from "@/lib/admin/overview";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const overview = await getAdminOverviewData();

  return <AdminOverviewContent overview={overview} />;
}
