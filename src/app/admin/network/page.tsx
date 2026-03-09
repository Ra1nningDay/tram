import { AdminNetworkContent } from "@/components/admin/AdminNetworkContent";
import { getAdminNetworkData } from "@/lib/admin/network";

export default async function AdminNetworkPage() {
  const network = await getAdminNetworkData();

  return <AdminNetworkContent network={network} />;
}
